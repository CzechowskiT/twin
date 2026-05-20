"""Health checks (public /health only — no feature-flag endpoint)."""

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
    assert data.get("git_commit") == "unknown"
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


def test_health_includes_git_commit_when_env_set(monkeypatch) -> None:
    monkeypatch.setenv("GIT_COMMIT_SHA", "abc123def456")
    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json().get("git_commit") == "abc123def456"


def test_health_features_route_removed() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health/features")
    assert res.status_code == 404


@patch("app.services.microsoft_calendar_oauth.is_microsoft_calendar_oauth_configured", return_value=False)
@patch("app.services.mail.is_mail_configured", return_value=True)
def test_health_ops_includes_mail_and_calendar_flags(
    _mock_ms: MagicMock,
    _mock_mail: MagicMock,
) -> None:
    client = TestClient(app)
    res = client.get("/api/v1/health?ops=1")
    assert res.status_code == 200
    data = res.json()
    assert data.get("mail_configured") is True
    assert data.get("microsoft_calendar_configured") is False
