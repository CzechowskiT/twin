"""Microsoft Graph busy-read preview adapter — mocked Graph only in tests."""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def preview_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(email="busy-preview@test.com", hashed_password="x", is_active=True)
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


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_busy_read_preview_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview")
    assert res.status_code == 401


def test_busy_read_preview_exposes_safety_flags_when_gate_off(preview_client, monkeypatch) -> None:
    client, headers, _db, _user = preview_client
    monkeypatch.setenv("MICROSOFT_BUSY_READ_ENABLED", "false")
    get_settings.cache_clear()
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview", headers=headers)
    get_settings.cache_clear()
    assert res.status_code == 200
    body = res.json()
    assert body["product_gate_enabled"] is False
    assert body["oauth_connect_gate_enabled"] is False
    assert body["calendar_write_gate_enabled"] is False
    assert "public_health_microsoft_configured" in body


def test_busy_read_preview_demo_when_gate_off(preview_client, monkeypatch) -> None:
    client, headers, _db, _user = preview_client
    monkeypatch.setenv("MICROSOFT_BUSY_READ_ENABLED", "false")
    get_settings.cache_clear()
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview", headers=headers)
    get_settings.cache_clear()
    assert res.status_code == 200
    body = res.json()
    assert body["preview_mode"] == "demo"
    assert len(body["busy_slot_preview"]) >= 2
    for slot in body["busy_slot_preview"]:
        assert slot["event_subject_redacted"] is True
        assert "subject" not in slot
        assert "title" not in slot


def test_busy_read_preview_not_connected_when_gate_on(preview_client, monkeypatch) -> None:
    client, headers, _db, _user = preview_client
    monkeypatch.setenv("MICROSOFT_BUSY_READ_ENABLED", "true")
    get_settings.cache_clear()
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview", headers=headers)
    get_settings.cache_clear()
    assert res.status_code == 200
    assert res.json()["preview_mode"] == "not_connected"
    assert res.json()["busy_slot_preview"] == []


def test_busy_read_preview_live_read_only_mocked_graph(preview_client, monkeypatch) -> None:
    client, headers, db, user = preview_client
    monkeypatch.setenv("MICROSOFT_BUSY_READ_ENABLED", "true")
    get_settings.cache_clear()

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

    mock_blocks = [{"start": "2026-06-25T10:00:00Z", "end": "2026-06-25T11:00:00Z"}]
    with patch(
        "app.services.microsoft_busy_read.probe_microsoft_calendar_health",
    ) as probe_mock:
        probe_mock.return_value = type(
            "P",
            (),
            {"connected": True, "health": "ok"},
        )()
        with patch(
            "app.services.microsoft_busy_read.resolve_microsoft_access_token",
        ) as token_mock:
            token_mock.return_value = type("T", (), {"token": "access-mock"})()
            with patch(
                "app.services.microsoft_busy_read.query_schedule",
                return_value={"value": []},
            ):
                with patch(
                    "app.services.microsoft_busy_read.schedule_items_to_busy_blocks",
                    return_value=mock_blocks,
                ):
                    res = client.get(
                        "/api/v1/calendar/microsoft/busy-read/preview",
                        headers=headers,
                    )

    get_settings.cache_clear()
    assert res.status_code == 200
    body = res.json()
    assert body["preview_mode"] == "live_read_only"
    assert body["busy_slot_preview"][0]["source"] == "live_read_only"
    assert body["busy_slot_preview"][0]["event_subject_redacted"] is True
    raw = json.dumps(body).lower()
    assert "access-mock" not in raw
    assert "rt-test" not in raw
