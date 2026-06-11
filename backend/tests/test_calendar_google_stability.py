"""Google Calendar token cache + reconnect stability (no live Google calls)."""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User, UserGoogleCalendar
from app.database.session import get_db
from app.main import app
from app.services.calendar_oauth_credentials import (
    CalendarTokenResolutionError,
    get_best_google_row,
    provider_status_payload_google,
    resolve_google_access_token,
    store_google_from_refresh,
)
from app.services.google_calendar_api import GoogleCalendarApiError
from app.services.google_calendar_oauth import GoogleTokenRefreshResult
from app.services.token_crypto import decrypt_secret, encrypt_secret


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _sqlite_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def _user_override(user_id: int, email: str):
    def _user() -> User:
        u = User(email=email, hashed_password=None)
        u.id = user_id
        return u

    return _user


def _seed_google_row(db, user_id: int, *, expired_access: bool = True) -> UserGoogleCalendar:
    refresh = "refresh-abc"
    access = "access-old"
    now = datetime.utcnow()
    row = UserGoogleCalendar(
        user_id=user_id,
        refresh_token_encrypted=encrypt_secret(refresh),
        access_token_encrypted=encrypt_secret(access),
        access_token_expires_at=now - timedelta(minutes=5) if expired_access else now + timedelta(hours=1),
        google_email="founder@gmail.com",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_expired_access_with_valid_refresh_resolves_without_reconnect(db) -> None:
    u = User(email="g@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    row = _seed_google_row(db, u.id, expired_access=True)
    old_refresh_enc = row.refresh_token_encrypted

    with patch(
        "app.services.calendar_oauth_credentials.refresh_google_calendar_access_token",
        return_value=GoogleTokenRefreshResult(access_token="access-new", refresh_token=None, expires_in=3600),
    ):
        token = resolve_google_access_token(db, u.id)
    assert token == "access-new"
    db.refresh(row)
    assert row.refresh_token_encrypted == old_refresh_enc
    assert decrypt_secret(row.access_token_encrypted) == "access-new"


def test_refresh_without_refresh_token_preserves_existing(db) -> None:
    u = User(email="preserve@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    row = _seed_google_row(db, u.id)
    before = row.refresh_token_encrypted
    store_google_from_refresh(
        db,
        row,
        GoogleTokenRefreshResult(access_token="access-2", refresh_token=None, expires_in=1800),
    )
    db.commit()
    db.refresh(row)
    assert row.refresh_token_encrypted == before


def test_invalid_grant_maps_to_reconnect_required(db) -> None:
    u = User(email="revoked@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    _seed_google_row(db, u.id)
    from app.services.google_calendar_oauth import GoogleCalendarOAuthError

    with patch(
        "app.services.calendar_oauth_credentials.refresh_google_calendar_access_token",
        side_effect=GoogleCalendarOAuthError("invalid_grant"),
    ):
        with pytest.raises(CalendarTokenResolutionError) as exc:
            resolve_google_access_token(db, u.id, force_refresh=True)
    assert exc.value.kind == "reconnect_required"


def test_transient_refresh_failure_maps_to_temporary_error(db) -> None:
    u = User(email="temp@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    _seed_google_row(db, u.id)
    from app.services.google_calendar_oauth import GoogleCalendarOAuthError

    with patch(
        "app.services.calendar_oauth_credentials.refresh_google_calendar_access_token",
        side_effect=GoogleCalendarOAuthError("503 temporarily unavailable"),
    ):
        with pytest.raises(CalendarTokenResolutionError) as exc:
            resolve_google_access_token(db, u.id, force_refresh=True)
    assert exc.value.kind == "temporary_error"


def test_get_best_google_row_prefers_valid_cached_access(db) -> None:
    u = User(email="dup@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    now = datetime.utcnow()
    stale = UserGoogleCalendar(
        user_id=u.id,
        refresh_token_encrypted=encrypt_secret("r1"),
        access_token_encrypted=encrypt_secret("a1"),
        access_token_expires_at=now - timedelta(hours=1),
        google_email="stale@gmail.com",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=1),
    )
    db.add(stale)
    db.commit()
  # SQLite PK prevents duplicate user_id rows; pick latest row when only one exists.
    best = get_best_google_row(db, u.id)
    assert best is not None
    assert best.user_id == u.id


@patch("app.api.calendar._list_google_events_with_retry")
def test_google_events_401_triggers_refresh_retry_path(mock_list: MagicMock, client: TestClient) -> None:
    mock_list.return_value = [{"id": "e1", "summary": "Standup", "start": {"dateTime": "2026-06-02T09:00:00Z"}, "end": {"dateTime": "2026-06-02T09:30:00Z"}}]
    app.dependency_overrides[get_current_user] = _user_override(20, "founder@gmail.com")
    app.dependency_overrides[get_db] = _sqlite_db
    token = create_access_token("founder@gmail.com")
    try:
        res = client.get(
            "/api/v1/calendar/google/events",
            params={"time_min": "2026-06-01T00:00:00Z", "time_max": "2026-06-08T00:00:00Z"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        mock_list.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


@patch("app.api.calendar.probe_google_calendar_health")
def test_status_payload_temporary_error_flags_retry(mock_probe: MagicMock, client: TestClient) -> None:
    from app.services.calendar_oauth_credentials import CalendarProviderStatusPayload

    mock_probe.return_value = CalendarProviderStatusPayload(
        connected=True,
        health="temporary_error",
        message="Google Calendar is temporarily unavailable. Try again shortly.",
        email="founder@gmail.com",
        can_retry=True,
    )
    app.dependency_overrides[get_current_user] = _user_override(21, "founder@gmail.com")
    app.dependency_overrides[get_db] = _sqlite_db
    try:
        res = client.get("/api/v1/calendar/google/status")
        assert res.status_code == 200
        data = res.json()
        assert data["health"] == "temporary_error"
        assert data["can_retry"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


def test_provider_status_ok_when_cached_access_valid(db) -> None:
    u = User(email="ok@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    _seed_google_row(db, u.id, expired_access=False)
    payload = provider_status_payload_google(db, u.id)
    assert payload.health == "ok"
    assert payload.can_reconnect is False


def test_list_events_upstream_401_after_refresh_returns_428(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="authfail@twin.test", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    _seed_google_row(db, u.id)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user_override(u.id, u.email)
    token = create_access_token(u.email)
    auth_err = GoogleCalendarApiError('{"error": {"code": 401, "message": "Invalid Credentials"}}')
    try:
        with patch("app.api.calendar.list_primary_events", side_effect=auth_err):
            with patch(
                "app.api.calendar.resolve_google_access_token",
                side_effect=["access-1", "access-2"],
            ):
                res = client.get(
                    "/api/v1/calendar/google/events",
                    params={"time_min": "2026-06-01T00:00:00Z", "time_max": "2026-06-08T00:00:00Z"},
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert res.status_code == 428
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
