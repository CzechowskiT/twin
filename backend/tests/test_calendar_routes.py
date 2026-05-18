"""Google Calendar API routes (no live Google calls)."""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Base, ScheduledInterview, User
from app.database.session import get_db
from app.main import app


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


def test_interview_ics_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/interviews/1/ics")
    assert res.status_code == 401


def test_interview_cancel_unauthenticated(client: TestClient) -> None:
    res = client.post("/api/v1/calendar/interviews/1/cancel")
    assert res.status_code == 401


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
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
