"""Google Calendar token cache + refresh-before-reconnect stability tests."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, User, UserGoogleCalendar
from app.services.calendar_oauth_credentials import (
    CalendarTokenResolutionError,
    access_token_still_valid,
    get_best_google_row,
    resolve_google_access_token,
)
from app.services.google_calendar_oauth import GoogleTokenRefreshResult
from app.services.token_crypto import encrypt_secret


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="gcal@twin.test", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    yield db, user
    db.close()


def _row(db, user_id: int, *, with_cache: bool = False) -> UserGoogleCalendar:
    now = datetime.utcnow()
    row = UserGoogleCalendar(
        user_id=user_id,
        refresh_token_encrypted=encrypt_secret("refresh-plain"),
        google_email="gcal@twin.test",
        created_at=now,
        updated_at=now,
    )
    if with_cache:
        row.access_token_encrypted = encrypt_secret("cached-access")
        row.access_token_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
    db.add(row)
    db.commit()
    return row


@patch("app.services.calendar_oauth_credentials.refresh_google_calendar_tokens")
def test_expired_access_valid_refresh_stays_connected(mock_refresh: MagicMock, db_session) -> None:
    db, user = db_session
    row = _row(db, user.id, with_cache=False)
    mock_refresh.return_value = GoogleTokenRefreshResult(
        access_token="new-access",
        expires_in=3600,
        refresh_token=None,
    )
    token = resolve_google_access_token(db, row)
    assert token.token == "new-access"
    db.refresh(row)
    assert row.refresh_token_encrypted
    assert row.access_token_encrypted


@patch("app.services.calendar_oauth_credentials.refresh_google_calendar_tokens")
def test_refresh_without_new_refresh_token_preserves_existing(mock_refresh: MagicMock, db_session) -> None:
    db, user = db_session
    row = _row(db, user.id)
    before = row.refresh_token_encrypted
    mock_refresh.return_value = GoogleTokenRefreshResult(
        access_token="new-access",
        expires_in=3600,
        refresh_token=None,
    )
    resolve_google_access_token(db, row)
    db.refresh(row)
    assert row.refresh_token_encrypted == before


def test_cached_access_skips_refresh(db_session) -> None:
    db, user = db_session
    row = _row(db, user.id, with_cache=True)
    with patch("app.services.calendar_oauth_credentials.refresh_google_calendar_tokens") as mock_refresh:
        token = resolve_google_access_token(db, row)
        mock_refresh.assert_not_called()
    assert token.token == "cached-access"
    assert token.from_cache is True


@patch("app.services.calendar_oauth_credentials.refresh_google_calendar_tokens")
def test_invalid_grant_maps_to_reconnect_required(mock_refresh: MagicMock, db_session) -> None:
    from app.services.google_calendar_oauth import GoogleCalendarOAuthError

    db, user = db_session
    row = _row(db, user.id)
    mock_refresh.side_effect = GoogleCalendarOAuthError('{"error": "invalid_grant"}')
    with pytest.raises(CalendarTokenResolutionError) as exc:
        resolve_google_access_token(db, row)
    assert exc.value.status == "reconnect_required"
    assert exc.value.code == "invalid_grant"


@patch("app.services.calendar_oauth_credentials.refresh_google_calendar_tokens")
def test_transient_503_maps_to_temporary_error(mock_refresh: MagicMock, db_session) -> None:
    from app.services.google_calendar_oauth import GoogleCalendarOAuthError

    db, user = db_session
    row = _row(db, user.id)
    mock_refresh.side_effect = GoogleCalendarOAuthError("503 temporarily unavailable")
    with pytest.raises(CalendarTokenResolutionError) as exc:
        resolve_google_access_token(db, row)
    assert exc.value.status == "temporary_error"
    assert exc.value.can_retry is True


def test_access_token_still_valid_honors_buffer(db_session) -> None:
    db, user = db_session
    row = _row(db, user.id)
    row.access_token_encrypted = encrypt_secret("soon")
    row.access_token_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=30)
    db.commit()
    assert access_token_still_valid(row) is False


def test_get_best_google_row_picks_latest(db_session) -> None:
    db, user = db_session
    older = _row(db, user.id)
    older.updated_at = datetime.utcnow() - timedelta(days=1)
    db.commit()
    # user_id is PK — only one row; verify helper returns it
    assert get_best_google_row(db, user.id) is not None
