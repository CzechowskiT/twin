"""Legacy POST /calendar/microsoft/interviews — product write gate (default off)."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


@pytest.fixture(autouse=True)
def _clear_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MICROSOFT_CALENDAR_WRITE_ENABLED", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def auth_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(email="ms-write-gate@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(app)
    yield client, headers, db, user
    app.dependency_overrides.clear()


def _schedule_body(application_id: int) -> dict:
    return {
        "application_id": application_id,
        "company_name": "Acme",
        "job_title": "Backend Engineer",
        "start_iso": "2026-07-01T10:00:00Z",
        "end_iso": "2026-07-01T11:00:00Z",
        "time_zone": "UTC",
    }


def test_settings_calendar_write_gate_default_false() -> None:
    settings = Settings()
    assert settings.microsoft_calendar_write_enabled is False


def test_microsoft_interviews_write_gate_off_returns_403_no_graph_write(auth_client) -> None:
    client, headers, _db, _user = auth_client
    with patch("app.api.calendar_microsoft.insert_calendar_event") as insert_mock:
        with patch("app.api.calendar_microsoft._microsoft_access_token", return_value="token"):
            res = client.post(
                "/api/v1/calendar/microsoft/interviews",
                headers=headers,
                json=_schedule_body(1),
            )
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()
    insert_mock.assert_not_called()


def test_microsoft_interviews_write_gate_on_calls_graph(auth_client, monkeypatch) -> None:
    client, headers, db, user = auth_client
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "true")
    get_settings.cache_clear()

    cand = Candidate(user_id=user.id, name="Test Candidate")
    db.add(cand)
    db.commit()
    db.refresh(cand)

    job = Job(
        title="Backend Engineer",
        company="Acme",
        location="Warsaw",
        job_board="pracuj",
        external_id="ext-1",
        url="https://example.com/job/1",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    application = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(application)
    db.commit()
    db.refresh(application)

    from app.database.models import UserMicrosoftCalendar
    from app.services.token_crypto import encrypt_secret

    db.add(
        UserMicrosoftCalendar(
            user_id=user.id,
            refresh_token_encrypted=encrypt_secret("rt-test"),
            microsoft_email="user@contoso.com",
        )
    )
    db.commit()

    created_event = {"id": "evt-123"}
    with patch("app.api.calendar_microsoft._microsoft_access_token", return_value="token"):
        with patch(
            "app.api.calendar_microsoft._ms_busy_as_google_fb",
            return_value={"calendars": {"primary": {"busy": []}}},
        ):
            with patch(
                "app.api.calendar_microsoft.insert_calendar_event",
                return_value=created_event,
            ) as insert_mock:
                res = client.post(
                    "/api/v1/calendar/microsoft/interviews",
                    headers=headers,
                    json=_schedule_body(application.id),
                )

    get_settings.cache_clear()
    assert res.status_code == 200
    insert_mock.assert_called_once()
