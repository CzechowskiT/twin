"""Public unauthenticated surfaces must never echo secrets/config internals."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app, create_app

FORBIDDEN_SUBSTRINGS = (
    "postgresql://",
    "postgres://",
    "redis://",
    "amqp://",
    "DATABASE_URL",
    "SECRET_KEY",
    "STRIPE_SECRET",
    "sk_live_",
    "sk_test_",
    "whsec_",
    "redirect_uri=",
    "redirect_uri",
    "dsn",
    "token",
    "secret",
    "ops_admin",
    "ops_admin_configured",
    "data_room",
    "data_room_bucket",
    "data_room_path",
    "SENTRY_DSN",
    "google_client_secret",
    "github_client_secret",
    "microsoft_client_secret",
    "apple_client_secret",
    "linkedin_client_secret",
    "google_redirect_uri",
    "github_redirect_uri",
    "microsoft_redirect_uri",
    "apple_redirect_uri",
    "linkedin_redirect_uri",
    "raw integration config",
    "raw oauth config",
    "INTERNAL_ENV",
    "RAILWAY_",
    "JWT_SECRET",
    "INTERNAL_",
    "Bearer ",
    "Traceback (most recent call last)",
)


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/status",
        "/waitlist",
        "/demo",
        "/login/candidate",
        "/dashboard",
        "/api/v1/health",
        "/api/v1/health?db=true",
        "/api/v1/health?ops=1",
        "/api/v1/beta/stats",
        "/api/v1/billing/plans",
        "/api/v1/public/mvp-stats",
        "/api/v1/demo/snapshot",
        "/api/public-health",
        "/robots.txt",
        "/sitemap.xml",
    ],
)
def test_public_get_never_leaks_secrets(path: str) -> None:
    with patch(
        "app.services.partner_auth.partner_export_configured", return_value=False
    ), patch(
        "app.services.mvp_public_metrics.count_validated_jobs_public_traction",
        return_value=0,
    ), patch("app.database.session.SessionLocal") as mock_session_local, patch(
        "app.services.market_coverage_status.build_market_coverage_status",
        return_value={"feed_stale": False, "warnings": []},
    ), patch("app.api.health._database_reachable", return_value=True):
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = MagicMock()
        mock_cm.__exit__.return_value = None
        mock_session_local.return_value = mock_cm

        client = TestClient(app)
        res = client.get(path)
        # Some frontend routes can be absent in local API-only test mode, but even 404
        # responses must not contain secrets.
        allowed = (200, 503, 404)
        assert res.status_code in allowed, (path, res.status_code, res.text[:300])
        text = res.text
        for needle in FORBIDDEN_SUBSTRINGS:
            assert needle not in text, (path, needle)


@pytest.mark.parametrize("path", ["/definitely-missing-public-route", "/api/v1/unknown-public-route"])
def test_public_404_response_never_leaks_secrets(path: str) -> None:
    client = TestClient(app)
    res = client.get(path)
    assert res.status_code == 404
    text = res.text
    for needle in FORBIDDEN_SUBSTRINGS:
        assert needle not in text, (path, needle)


def test_public_500_response_is_sanitized() -> None:
    probe_app = create_app()

    @probe_app.get("/__public_probe_500")
    def _public_probe_500() -> None:
        raise HTTPException(status_code=500, detail="raw-oauth-config-secret")

    client = TestClient(probe_app)
    res = client.get("/__public_probe_500")
    assert res.status_code == 500
    assert res.json() == {"detail": "Internal server error"}
    for needle in FORBIDDEN_SUBSTRINGS:
        assert needle not in res.text, needle
