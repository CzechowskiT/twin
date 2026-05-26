"""Health checks (public /health only — no feature-flag endpoint)."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.config import get_settings
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


@patch("app.services.partner_auth.partner_export_configured", return_value=True)
@patch("app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=42)
@patch("app.database.session.SessionLocal")
@patch("app.services.linkedin_oauth.is_linkedin_oauth_configured", return_value=True)
@patch("app.services.google_calendar_oauth.is_google_calendar_oauth_configured", return_value=False)
@patch("app.services.microsoft_calendar_oauth.is_microsoft_calendar_oauth_configured", return_value=False)
@patch("app.services.mail.is_mail_configured", return_value=True)
def test_health_ops_includes_mail_and_calendar_flags(
    _mock_mail: MagicMock,
    _mock_google: MagicMock,
    _mock_ms: MagicMock,
    _mock_li: MagicMock,
    _mock_session_local: MagicMock,
    _mock_jobs: MagicMock,
    _mock_partner: MagicMock,
) -> None:
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = MagicMock()
    mock_cm.__exit__.return_value = None
    _mock_session_local.return_value = mock_cm
    client = TestClient(app)
    res = client.get("/api/v1/health?ops=1")
    assert res.status_code == 200
    data = res.json()
    assert data.get("mail_configured") is True
    assert data.get("google_calendar_configured") is False
    assert data.get("microsoft_calendar_configured") is False
    assert data.get("stripe_checkout_ready") is False
    assert data.get("scrape_worker_ready") is False
    assert data.get("scrape_beat_enabled") is False
    assert data.get("linkedin_oauth_configured") is True
    assert data.get("validated_jobs") == 42
    assert data.get("partner_export_configured") is True
    assert "data_room_s3_enabled" not in data
    assert "google_redirect_uri" not in data
    assert "ops_admin_configured" not in data
    assert "celery_task_always_eager" not in data
    assert "market_coverage_ops_hint" in data


@patch("app.api.health._database_reachable", return_value=True)
@patch("app.services.market_coverage_status.build_market_coverage_status")
@patch("app.services.partner_auth.partner_export_configured", return_value=False)
@patch("app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0)
@patch("app.database.session.SessionLocal")
@patch("app.services.linkedin_oauth.is_linkedin_oauth_configured", return_value=False)
@patch("app.services.google_calendar_oauth.is_google_calendar_oauth_configured", return_value=False)
@patch("app.services.microsoft_calendar_oauth.is_microsoft_calendar_oauth_configured", return_value=False)
@patch("app.services.mail.is_mail_configured", return_value=False)
def test_health_ops_db_coerces_market_coverage_types(
    _mock_mail: MagicMock,
    _mock_google: MagicMock,
    _mock_ms: MagicMock,
    _mock_li: MagicMock,
    _mock_session_local: MagicMock,
    _mock_jobs: MagicMock,
    _mock_partner: MagicMock,
    _mock_mc: MagicMock,
    _mock_db: MagicMock,
) -> None:
    """Regression: null last_scrape_at and float progress must not 500 on response validation."""
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = MagicMock()
    mock_cm.__exit__.return_value = None
    _mock_session_local.return_value = mock_cm
    _mock_mc.return_value = {
        "last_scrape_run_at": None,
        "progress_to_10k_pct": 12.7,
        "active_validated_jobs": 1270,
        "feed_stale": True,
        "warnings": ["feed_stale_no_recent_scrape"],
    }
    client = TestClient(app)
    for query in ("ops=1", "db=1&ops=1", "db=true&ops=true"):
        res = client.get(f"/api/v1/health?{query}")
        assert res.status_code == 200, (query, res.text)
        data = res.json()
        assert data.get("market_coverage_last_scrape_at") == ""
        assert data.get("market_coverage_progress_pct") == 13
        assert data.get("market_coverage_active_validated") == 1270
        assert data.get("market_coverage_feed_stale") is True
        if "db" in query:
            assert data.get("db_ok") is True


def test_admin_deploy_health_requires_token(monkeypatch) -> None:
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-test-token")
    get_settings.cache_clear()
    client = TestClient(app)
    res = client.get("/api/v1/admin/deploy-health")
    assert res.status_code == 401


@patch("app.services.partner_auth.partner_export_configured", return_value=False)
@patch("app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0)
@patch("app.database.session.SessionLocal")
@patch("app.services.market_coverage_status.build_market_coverage_status")
def test_admin_deploy_health_includes_redirect_uris(
    _mock_mc: MagicMock,
    _mock_session_local: MagicMock,
    _mock_jobs: MagicMock,
    _mock_partner: MagicMock,
    monkeypatch,
) -> None:
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-test-token")
    get_settings.cache_clear()
    mock_cm = MagicMock()
    mock_cm.__enter__.return_value = MagicMock()
    mock_cm.__exit__.return_value = None
    _mock_session_local.return_value = mock_cm
    _mock_mc.return_value = {"feed_stale": False, "warnings": []}
    client = TestClient(app)
    res = client.get(
        "/api/v1/admin/deploy-health",
        headers={"Authorization": "Bearer ops-test-token"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "google_redirect_uri" in data
    assert data.get("ops_admin_configured") is True
