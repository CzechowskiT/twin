"""ATS integration webhook surface."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_greenhouse_webhook_ok_without_secret() -> None:
    client = TestClient(app)
    res = client.post("/api/v1/integrations/ats/greenhouse", json={"action": "ping", "application": {"id": 1}})
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


@patch("app.api.integrations_ats.get_settings")
def test_greenhouse_webhook_rejects_bad_signature(mock_gs: MagicMock) -> None:
    s = MagicMock()
    s.greenhouse_webhook_secret = "secret"
    mock_gs.return_value = s
    client = TestClient(app)
    res = client.post(
        "/api/v1/integrations/ats/greenhouse",
        content=b'{"action":"hire_candidate"}',
        headers={"Content-Type": "application/json", "X-Greenhouse-Signature": "deadbeef"},
    )
    assert res.status_code == 403
