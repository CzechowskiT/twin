"""Microsoft busy-read product gate safety — gates off by default, no write scopes."""

import json
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app
from app.services.microsoft_calendar_oauth import MS_CALENDAR_SCOPES, effective_microsoft_calendar_scopes

FORBIDDEN_WRITE_TOKENS = ("Calendars.ReadWrite", "Mail.Send", "OnlineMeetings.ReadWrite")


@pytest.fixture(autouse=True)
def _clear_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MICROSOFT_BUSY_READ_ENABLED", raising=False)
    monkeypatch.delenv("MICROSOFT_OAUTH_CONNECT_GATE_ENABLED", raising=False)
    get_settings.cache_clear()


@pytest.fixture
def gate_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(email="gate-safety@test.com", hashed_password="x", is_active=True)
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
    yield client, headers
    app.dependency_overrides.clear()


def test_settings_product_gates_default_false() -> None:
    settings = Settings()
    assert settings.microsoft_busy_read_enabled is False
    assert settings.microsoft_oauth_connect_gate_enabled is False


@patch("app.services.partner_auth.partner_export_configured", return_value=False)
@patch("app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0)
@patch("app.database.session.SessionLocal")
def test_public_health_gates_false_by_default(
    mock_session_local: MagicMock,
    _mock_jobs: MagicMock,
    _mock_partner: MagicMock,
) -> None:
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = MagicMock()
    mock_cm.__exit__.return_value = None
    mock_session_local.return_value = mock_cm
    client = TestClient(app)
    res = client.get("/api/v1/health?ops=1")
    assert res.status_code == 200
    data = res.json()
    assert data.get("microsoft_busy_read_enabled") is False
    assert data.get("microsoft_oauth_connect_gate_enabled") is False


def test_busy_read_readiness_gates_false_when_env_unset(gate_client) -> None:
    client, headers = gate_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["product_gate_enabled"] is False
    assert body["oauth_connect_gate_enabled"] is False
    assert body["busy_read_status"] == "demo_busy_slots_available"


def test_busy_read_preview_demo_when_gate_off(gate_client) -> None:
    client, headers = gate_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["preview_mode"] == "demo"
    assert body["source"] == "demo"


def test_required_scopes_exclude_write_tokens(gate_client) -> None:
    client, headers = gate_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness", headers=headers)
    scopes = res.json()["required_scopes"]
    for token in FORBIDDEN_WRITE_TOKENS:
        assert token not in scopes


def test_authorize_url_read_only_when_gates_off(
    gate_client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv(
        "MICROSOFT_CALENDAR_REDIRECT_URI",
        "http://localhost:8000/api/v1/calendar/microsoft/callback",
    )
    get_settings.cache_clear()
    client, headers = gate_client
    res = client.get("/api/v1/calendar/microsoft/authorize", headers=headers)
    assert res.status_code == 200
    url = res.json()["authorize_url"]
    scope = parse_qs(urlparse(url).query)["scope"][0]
    assert "Calendars.Read" in scope.split()
    assert "Calendars.ReadWrite" not in scope.split()
    assert scope == MS_CALENDAR_SCOPES


def test_env_write_scope_override_still_sanitized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "MICROSOFT_CALENDAR_SCOPES",
        "offline_access User.Read Calendars.ReadWrite",
    )
    get_settings.cache_clear()
    settings = get_settings()
    scopes = effective_microsoft_calendar_scopes(settings)
    assert "Calendars.ReadWrite" not in scopes.split()
    raw = json.dumps({"scopes": scopes.split()})
    for token in FORBIDDEN_WRITE_TOKENS:
        assert token not in raw
