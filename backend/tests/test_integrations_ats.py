"""ATS integration webhook surface."""

import hashlib
import hmac
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def _sign(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_ok_without_secret_in_development(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "development"
    s.greenhouse_webhook_secret = ""
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post("/api/v1/integrations/ats/greenhouse", json={"action": "ping", "application": {"id": 1}})
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_rejects_missing_secret_in_production(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "production"
    s.greenhouse_webhook_secret = ""
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post("/api/v1/integrations/ats/greenhouse", json={"action": "ping"})
    assert res.status_code == 403
    assert "secret" in res.json()["detail"].lower()


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_rejects_missing_signature_header(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "development"
    s.greenhouse_webhook_secret = "secret"
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post(
        "/api/v1/integrations/ats/greenhouse",
        content=b'{"action":"hire_candidate"}',
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 403
    assert "Missing" in res.json()["detail"]


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_rejects_bad_signature(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "development"
    s.greenhouse_webhook_secret = "secret"
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post(
        "/api/v1/integrations/ats/greenhouse",
        content=b'{"action":"hire_candidate"}',
        headers={"Content-Type": "application/json", "X-Greenhouse-Signature": "deadbeef"},
    )
    assert res.status_code == 403
    assert "Invalid" in res.json()["detail"]


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_accepts_valid_signature(mock_gs: MagicMock) -> None:
    secret = "test-secret-123"
    body = b'{"action":"ping","application":{"id":1}}'
    s = MagicMock()
    s.environment = "production"
    s.greenhouse_webhook_secret = secret
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post(
        "/api/v1/integrations/ats/greenhouse",
        content=body,
        headers={
            "Content-Type": "application/json",
            "X-Greenhouse-Signature": _sign(body, secret),
        },
    )
    assert res.status_code == 200


@patch("app.api.integrations_ats.get_settings")
def test_lever_webhook_ok_without_secret_in_development(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "development"
    s.lever_webhook_secret = ""
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post("/api/v1/integrations/ats/lever", json={"event": "ping"})
    assert res.status_code == 200


@patch("app.api.integrations_ats.get_settings")
def test_ashby_webhook_ok_without_secret_in_development(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.environment = "development"
    s.ashby_webhook_secret = ""
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post("/api/v1/integrations/ats/ashby", json={"eventName": "ping"})
    assert res.status_code == 200


@patch("app.api.integrations_ats.get_settings")
def test_ashby_webhook_rejects_bad_signature(mock_gs: MagicMock) -> None:
    secret = "ashby-secret"
    body = b'{"eventName":"applicationHired","data":{"application":{"id":"a1"}}}'
    s = MagicMock()
    s.environment = "production"
    s.ashby_webhook_secret = secret
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post(
        "/api/v1/integrations/ats/ashby",
        content=body,
        headers={"Content-Type": "application/json", "Ashby-Signature": "sha256=bad"},
    )
    assert res.status_code == 403


def test_ats_setup_returns_providers() -> None:
    from app.core.deps import get_current_user
    from app.database.models import User

    user = User(id=1, email="rec@example.com", hashed_password="x", is_active=True)

    def _user() -> User:
        return user

    app.dependency_overrides[get_current_user] = _user
    try:
        client = TestClient(app)
        res = client.get("/api/v1/integrations/ats/setup")
        assert res.status_code == 200
        body = res.json()
        assert len(body["providers"]) == 3
        assert body["providers"][0]["provider"] == "greenhouse"
        assert "/api/v1/integrations/ats/greenhouse" in body["providers"][0]["webhook_url"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
