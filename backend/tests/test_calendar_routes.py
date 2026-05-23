"""Google Calendar API routes (no live Google calls)."""

import hashlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, ScheduledInterview, User
from app.database.session import get_db
from app.main import app
from app.services.google_calendar_api import GoogleCalendarApiError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_token_crypto_roundtrip() -> None:
    from app.services.token_crypto import decrypt_secret, encrypt_secret

    s = "refresh-token-test"
    assert decrypt_secret(encrypt_secret(s)) == s


def test_calendar_authorize_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/google/authorize")
    assert res.status_code == 401


def test_google_list_events_unauthenticated(client: TestClient) -> None:
    res = client.get(
        "/api/v1/calendar/google/events",
        params={
            "time_min": "2026-05-01T00:00:00Z",
            "time_max": "2026-05-08T00:00:00Z",
        },
    )
    assert res.status_code == 401


def test_google_list_events_returns_normalized_items(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="events@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="events@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    mock_items = [
        {
            "id": "evt-1",
            "summary": "Standup",
            "start": {"dateTime": "2026-05-02T09:00:00Z"},
            "end": {"dateTime": "2026-05-02T09:30:00Z"},
            "htmlLink": "https://calendar.google.com/event?eid=1",
        }
    ]
    try:
        with patch("app.api.calendar.list_primary_events", return_value=mock_items):
            with patch("app.api.calendar._calendar_access_token", return_value="tok"):
                res = client.get(
                    "/api/v1/calendar/google/events",
                    params={
                        "time_min": "2026-05-01T00:00:00Z",
                        "time_max": "2026-05-08T00:00:00Z",
                    },
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert res.status_code == 200
        body = res.json()
        assert len(body["events"]) == 1
        assert body["events"][0]["id"] == "evt-1"
        assert body["events"][0]["title"] == "Standup"
        assert body["events"][0]["source"] == "provider"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_interview_ics_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/interviews/1/ics")
    assert res.status_code == 401


def test_interview_ics_token_mint_and_shared_download(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="ics-share@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    start = datetime.utcnow() + timedelta(days=1)
    end = start + timedelta(hours=1)
    inv = ScheduledInterview(
        user_id=u.id,
        company_name="Twin Labs",
        job_title="Backend",
        interviewer_name=None,
        interviewer_email=None,
        interview_start=start,
        interview_end=end,
        timezone="UTC",
        interview_type="video",
        status="scheduled",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="ics-share@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        mint = client.post(
            f"/api/v1/calendar/interviews/{inv.id}/ics-token",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert mint.status_code == 200
        payload = mint.json()
        raw = payload["token"]
        assert len(raw) >= 16
        db.refresh(inv)
        assert inv.ics_access_token_hash == hashlib.sha256(raw.encode("utf-8")).hexdigest()
        assert inv.ics_access_token_expires_at is not None

        dl = client.get(f"/api/v1/calendar/interviews/{inv.id}/ics-shared?token={raw}")
        assert dl.status_code == 200
        assert "BEGIN:VCALENDAR" in dl.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_interview_cancel_unauthenticated(client: TestClient) -> None:
    res = client.post("/api/v1/calendar/interviews/1/cancel")
    assert res.status_code == 401


def test_interview_cancel_deletes_google_event_when_linked(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="cancel-gcal@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    start = datetime.utcnow() + timedelta(days=1)
    end = start + timedelta(hours=1)
    inv = ScheduledInterview(
        user_id=u.id,
        company_name="Co",
        job_title="Dev",
        interviewer_name=None,
        interviewer_email=None,
        interview_start=start,
        interview_end=end,
        timezone="UTC",
        interview_type="video",
        status="scheduled",
        calendar_event_id="evt-abc",
        calendar_provider="google",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="cancel-gcal@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        with patch("app.api.calendar.delete_primary_event") as mock_del:
            with patch("app.api.calendar._calendar_access_token", return_value="tok"):
                res = client.post(
                    f"/api/v1/calendar/interviews/{inv.id}/cancel",
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert res.status_code == 204
        mock_del.assert_called_once_with("tok", "evt-abc")
        db.refresh(inv)
        assert inv.status == "cancelled"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_interview_cancel_still_persists_when_google_delete_fails(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="cancel-fail@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    start = datetime.utcnow() + timedelta(days=2)
    end = start + timedelta(hours=1)
    inv = ScheduledInterview(
        user_id=u.id,
        company_name="Co",
        job_title="Dev",
        interviewer_name=None,
        interviewer_email=None,
        interview_start=start,
        interview_end=end,
        timezone="UTC",
        interview_type="video",
        status="scheduled",
        calendar_event_id="evt-x",
        calendar_provider="google",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="cancel-fail@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        with patch("app.api.calendar.delete_primary_event", side_effect=GoogleCalendarApiError("no")):
            with patch("app.api.calendar._calendar_access_token", return_value="tok"):
                res = client.post(
                    f"/api/v1/calendar/interviews/{inv.id}/cancel",
                    headers={"Authorization": f"Bearer {token}"},
                )
        assert res.status_code == 204
        db.refresh(inv)
        assert inv.status == "cancelled"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


@patch("app.api.calendar.is_google_calendar_oauth_configured", return_value=False)
def test_calendar_authorize_not_configured(_mock: MagicMock, client: TestClient) -> None:
    from app.core.deps import get_current_user
    from app.database.models import User

    def _user() -> User:
        u = User(email="x@y.com", hashed_password=None)
        u.id = 1
        return u

    app.dependency_overrides[get_current_user] = _user
    try:
        res = client.get("/api/v1/calendar/google/authorize")
        assert res.status_code == 503
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@patch("app.api.calendar.get_settings")
def test_calendar_callback_invalid_state(mock_settings: MagicMock, client: TestClient) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    res = client.get("/api/v1/calendar/google/callback?code=abc&state=bad", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"].startswith("http://localhost:3000/dashboard/calendar?")
    assert "calendar_error=invalid_state" in res.headers["location"]


def test_google_calendar_list_interviews_include_cancelled(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="cal-list@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)

    future = datetime.utcnow() + timedelta(days=2)
    end = future + timedelta(hours=1)
    active = ScheduledInterview(
        user_id=u.id,
        company_name="Acme",
        job_title="Engineer",
        interviewer_name=None,
        interviewer_email=None,
        interview_start=future,
        interview_end=end,
        timezone="UTC",
        interview_type="video",
        status="scheduled",
    )
    cancelled = ScheduledInterview(
        user_id=u.id,
        company_name="Beta",
        job_title="PM",
        interviewer_name=None,
        interviewer_email=None,
        interview_start=future + timedelta(hours=3),
        interview_end=future + timedelta(hours=4),
        timezone="UTC",
        interview_type="video",
        status="cancelled",
    )
    db.add_all([active, cancelled])
    db.commit()
    db.refresh(active)
    db.refresh(cancelled)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="cal-list@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    try:
        res = client.get("/api/v1/calendar/google/interviews")
        assert res.status_code == 200
        ids = {r["id"] for r in res.json()}
        assert active.id in ids
        assert cancelled.id not in ids

        res2 = client.get("/api/v1/calendar/google/interviews?include_cancelled=true")
        assert res2.status_code == 200
        ids2 = {r["id"] for r in res2.json()}
        assert active.id in ids2
        assert cancelled.id in ids2

        res_limit = client.get("/api/v1/calendar/google/interviews?limit=1")
        assert res_limit.status_code == 200
        assert len(res_limit.json()) == 1

        res_combo = client.get("/api/v1/calendar/google/interviews?limit=50&include_cancelled=false")
        assert res_combo.status_code == 200
        combo_ids = {r["id"] for r in res_combo.json()}
        assert active.id in combo_ids
        assert cancelled.id not in combo_ids

        res_both = client.get("/api/v1/calendar/google/interviews?include_cancelled=true&limit=50")
        assert res_both.status_code == 200
        both_ids = {r["id"] for r in res_both.json()}
        assert active.id in both_ids
        assert cancelled.id in both_ids
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def _sqlite_calendar_session():
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


@patch("app.api.calendar.is_google_calendar_oauth_configured", return_value=False)
def test_google_calendar_status_reports_oauth_configured(_mock: MagicMock, client: TestClient) -> None:
    from app.core.deps import get_current_user

    def _user() -> User:
        u = User(email="cal@twin.test", hashed_password=None)
        u.id = 1
        return u

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_db] = _sqlite_calendar_session
    try:
        res = client.get("/api/v1/calendar/google/status")
        assert res.status_code == 200
        data = res.json()
        assert data["connected"] is False
        assert data["oauth_configured"] is False
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)


@patch("app.api.calendar_microsoft.is_microsoft_calendar_oauth_configured", return_value=True)
def test_microsoft_calendar_status_reports_oauth_configured(_mock: MagicMock, client: TestClient) -> None:
    from app.core.deps import get_current_user

    def _user() -> User:
        u = User(email="ms@twin.test", hashed_password=None)
        u.id = 2
        return u

    app.dependency_overrides[get_current_user] = _user
    app.dependency_overrides[get_db] = _sqlite_calendar_session
    try:
        res = client.get("/api/v1/calendar/microsoft/status")
        assert res.status_code == 200
        data = res.json()
        assert data["connected"] is False
        assert data["oauth_configured"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
