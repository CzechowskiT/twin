"""Public GET surfaces must never echo secrets or connection strings.

Extends `test_public_health_regression.py` to every marketing / status /
billing-plans route that unauthenticated users and smoke probes hit.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

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
    "ops_admin",
    "Bearer ",
    "Traceback (most recent call last)",
)


@pytest.mark.parametrize(
    "path",
    [
        "/",
        "/api/v1/health",
        "/api/v1/health?db=true",
        "/api/v1/health?ops=1",
        "/api/v1/beta/stats",
        "/api/v1/billing/plans",
        "/api/v1/public/mvp-stats",
        "/api/v1/demo/snapshot",
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
        allowed = (200, 503)
        if path == "/api/v1/demo/snapshot":
            allowed = (200, 503, 404)  # 404 is expected when demo mode is disabled.
        assert res.status_code in allowed, (path, res.status_code, res.text[:300])
        text = res.text
        for needle in FORBIDDEN_SUBSTRINGS:
            assert needle not in text, (path, needle)
