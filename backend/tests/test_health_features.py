"""Health feature flags."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_features_ok() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 200
    data = res.json()
    assert "google_calendar_oauth_configured" in data
    assert "smtp_configured" in data
    assert isinstance(data["google_calendar_oauth_configured"], bool)
    assert isinstance(data["smtp_configured"], bool)
