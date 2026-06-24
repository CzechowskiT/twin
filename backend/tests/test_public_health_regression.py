"""Public `/api/v1/health` contract regression tests.

The smoke workflow on GitHub Actions hits this endpoint after every
deploy (`scripts/smoke_prod_health.sh`). The shape of the response —
which keys are present, which keys are *never* present — is part of
our **public** contract; CI smoke depends on it and the
status / pricing pages on the frontend read it as a liveness signal.

This file freezes that contract so a refactor on
`app/api/health.py` or `app/services/health_ops.py` cannot silently
drop a smoke-watched field or leak something we never want public.

Pairs with:

- `frontend/scripts/security-headers.test.ts` (the frontend
  response-header structural test);
- `scripts/smoke_prod_health.sh` (the workflow that calls this
  endpoint after deploy);
- `docs/CI_SMOKE_HEALTH_FIX_2026-05-27.md` (the prior contract
  bump).
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_public_health_minimal_shape_is_locked() -> None:
    """Default `/health` (no flags) returns exactly these three keys."""
    client = TestClient(app)
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert set(body.keys()) == {"status", "service", "git_commit"}, body
    assert body["status"] == "ok"
    assert body["service"] == "twin-api"


def test_public_health_response_is_pure_json() -> None:
    """Content-Type pins `application/json` so curl / smoke can rely on it."""
    client = TestClient(app)
    res = client.get("/api/v1/health")
    ct = res.headers.get("content-type", "")
    assert ct.startswith("application/json"), ct


def test_public_health_never_leaks_db_dsn_or_secrets() -> None:
    """The body must never carry connection strings, tokens, or stack frames.

    We re-run with every flag combination (default, db, ops, both)
    and grep the body for tell-tale substrings.
    """
    forbidden = (
        "postgresql://",
        "postgres://",
        "redis://",
        "amqp://",
        "DATABASE_URL",
        "SECRET_KEY",
        "STRIPE_SECRET",
        "Bearer ",
        "Traceback (most",  # never echo a stack
        "Internal Server Error",  # never expose the body of a 500
    )
    with patch(
        "app.services.partner_auth.partner_export_configured", return_value=False
    ), patch(
        "app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0
    ), patch(
        "app.database.session.SessionLocal"
    ) as mock_session_local, patch(
        "app.services.market_coverage_status.build_market_coverage_status",
        return_value={"feed_stale": False, "warnings": []},
    ):
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = MagicMock()
        mock_cm.__exit__.return_value = None
        mock_session_local.return_value = mock_cm

        client = TestClient(app)
        for query in ("", "?db=true", "?ops=1", "?db=1&ops=1"):
            res = client.get(f"/api/v1/health{query}")
            assert res.status_code == 200, (query, res.text)
            text = res.text
            for needle in forbidden:
                assert needle not in text, (query, needle, text[:500])


def test_public_health_db_flag_keys_remain_stable() -> None:
    """With `db=true`, the response must add **only** `db_ok` as a bool.

    Smoke probes pin on `db_ok in body`, so a refactor that renamed it
    (e.g. to `database_reachable`) would silently break prod alerts
    without anything failing locally.
    """
    with patch("app.api.health._database_reachable", return_value=True):
        client = TestClient(app)
        res = client.get("/api/v1/health?db=true")
        assert res.status_code == 200
        body = res.json()
        assert "db_ok" in body
        assert isinstance(body["db_ok"], bool)


def test_public_health_ops_flag_does_not_include_admin_only_fields() -> None:
    """`?ops=1` is public; admin-only env keys must stay off this surface.

    Documented contract in `app/services/health_ops.py`:
    `build_health_ops_public` is the **only** dict allowed on this
    response path. The admin-only extensions live behind
    `/admin/deploy-health` and the `OPS_ADMIN_TOKEN` gate.
    """
    with patch(
        "app.services.partner_auth.partner_export_configured", return_value=False
    ), patch(
        "app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0
    ), patch(
        "app.database.session.SessionLocal"
    ) as mock_session_local, patch(
        "app.services.mail.is_mail_configured", return_value=False
    ), patch(
        "app.services.market_coverage_status.build_market_coverage_status",
        return_value={"feed_stale": False, "warnings": []},
    ):
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = MagicMock()
        mock_cm.__exit__.return_value = None
        mock_session_local.return_value = mock_cm

        client = TestClient(app)
        res = client.get("/api/v1/health?ops=1")
        assert res.status_code == 200
        body = res.json()
        forbidden_admin_keys = (
            "google_redirect_uri",
            "microsoft_redirect_uri",
            "apple_redirect_uri",
            "linkedin_redirect_uri",
            "ops_admin_configured",
            "ops_admin_token",
            "celery_task_always_eager",
            "data_room_s3_enabled",
        )
        for key in forbidden_admin_keys:
            assert key not in body, key


def test_public_health_does_not_expose_powered_by_or_server_banner() -> None:
    """Tech-stack disclosure headers must be stripped or absent.

    A FastAPI/Uvicorn default `server: uvicorn` banner gives an
    attacker a free fingerprint. We confirm we do not introduce
    one; a `server: nginx` from Railway's ingress is acceptable
    because it doesn't reveal the application stack.
    """
    client = TestClient(app)
    res = client.get("/api/v1/health")
    server = res.headers.get("server", "").lower()
    assert "uvicorn" not in server, server
    assert "fastapi" not in server, server
    powered_by = res.headers.get("x-powered-by")
    assert powered_by is None, powered_by


def test_public_health_request_id_present_on_every_response() -> None:
    """`X-Request-ID` is mandatory for log correlation across the smoke chain.

    Already covered in `test_request_id.py` for one case; we re-assert
    here on a different code path (the `ops=1` branch) to catch a
    regression where the middleware wouldn't fire after the new
    `ops` builder.
    """
    with patch(
        "app.services.partner_auth.partner_export_configured", return_value=False
    ), patch(
        "app.services.mvp_public_metrics.count_validated_jobs_public_traction", return_value=0
    ), patch(
        "app.database.session.SessionLocal"
    ) as mock_session_local, patch(
        "app.services.market_coverage_status.build_market_coverage_status",
        return_value={"feed_stale": False, "warnings": []},
    ):
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = MagicMock()
        mock_cm.__exit__.return_value = None
        mock_session_local.return_value = mock_cm

        client = TestClient(app)
        res = client.get("/api/v1/health?ops=1")
        rid = res.headers.get("X-Request-ID") or res.headers.get("x-request-id")
        assert rid and len(rid) >= 8


def test_public_health_celery_status_keys_remain_stable() -> None:
    """`/health/celery-status` returns the booleans the dashboard depends on.

    Status / pricing page polls these; renaming a key would silently
    flip the dashboard to "Celery offline" without anything failing
    locally.
    """
    client = TestClient(app)
    res = client.get("/api/v1/health/celery-status")
    assert res.status_code == 200
    body = res.json()
    required_keys = {
        "celery_task_always_eager",
        "broker_configured",
        "scrape_beat_enabled",
        "nightly_auto_apply_beat_enabled",
        "beat_schedule_has_nightly",
        "beat_schedule_has_market_scrape_pl",
        "beat_schedule_market_tasks",
        "worker_active",
    }
    assert required_keys <= set(body.keys()), body
    assert isinstance(body["celery_task_always_eager"], bool)
    assert isinstance(body["broker_configured"], bool)
    assert isinstance(body["nightly_auto_apply_beat_enabled"], bool)
    assert isinstance(body["beat_schedule_has_nightly"], bool)
    assert isinstance(body["worker_active"], bool)


def test_public_health_405_on_post() -> None:
    """`/health` is GET-only; POST returns 405, not 200.

    Defends against a refactor that accidentally adds POST to
    the router and starts running side-effects on `curl -X POST
    /api/v1/health` from the smoke probe.
    """
    client = TestClient(app)
    res = client.post("/api/v1/health")
    assert res.status_code == 405, res.text
