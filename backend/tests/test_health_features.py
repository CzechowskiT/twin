"""Health checks and feature flags (all branches)."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_health_ok() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "twin-api"
    assert "db_ok" not in data


@patch("app.api.health._database_reachable", return_value=True)
def test_health_with_db_flag_includes_db_ok(_mock_db: MagicMock) -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health?db=true")
    assert res.status_code == 200
    data = res.json()
    assert data.get("db_ok") is True


@patch("app.api.health._database_reachable", return_value=False)
def test_health_with_db_flag_reports_false_when_unreachable(_mock_db: MagicMock) -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health?db=true")
    assert res.status_code == 200
    assert res.json().get("db_ok") is False


def test_health_features_ok() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 200
    data = res.json()
    assert "google_calendar_oauth_configured" in data
    assert "smtp_configured" in data
    assert isinstance(data["google_calendar_oauth_configured"], bool)
    assert isinstance(data["smtp_configured"], bool)


@patch("app.api.health.is_google_calendar_oauth_configured", return_value=True)
@patch("app.api.health.get_settings")
def test_health_features_google_on_smtp_off(
    mock_get_settings: MagicMock, _mock_gcal: MagicMock
) -> None:
    s = MagicMock()
    s.smtp_host = ""
    s.smtp_from = ""
    mock_get_settings.return_value = s
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 200
    data = res.json()
    assert data["google_calendar_oauth_configured"] is True
    assert data["smtp_configured"] is False


@patch("app.api.health.is_google_calendar_oauth_configured", return_value=False)
@patch("app.api.health.get_settings")
def test_health_features_google_off_smtp_on(
    mock_get_settings: MagicMock, _mock_gcal: MagicMock
) -> None:
    s = MagicMock()
    s.smtp_host = "smtp.example.com"
    s.smtp_from = "noreply@example.com"
    mock_get_settings.return_value = s
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 200
    data = res.json()
    assert data["google_calendar_oauth_configured"] is False
    assert data["smtp_configured"] is True


@patch("app.api.health.is_google_calendar_oauth_configured", return_value=True)
@patch("app.api.health.get_settings")
def test_health_features_both_on(mock_get_settings: MagicMock, _mock_gcal: MagicMock) -> None:
    s = MagicMock()
    s.smtp_host = "smtp.example.com"
    s.smtp_from = "noreply@example.com"
    mock_get_settings.return_value = s
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 200
    data = res.json()
    assert data["google_calendar_oauth_configured"] is True
    assert data["smtp_configured"] is True
