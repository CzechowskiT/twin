"""Health check endpoints."""

import os

from fastapi import APIRouter, Query
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.database.session import engine

router = APIRouter()


def _git_commit_sha() -> str | None:
    """Optional deploy traceability (set in Railway/Vercel/Docker build)."""
    for name in ("GIT_COMMIT_SHA", "RAILWAY_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_SHA", "GIT_COMMIT"):
        raw = (os.getenv(name) or "").strip()
        if raw:
            return raw[:64]
    return None


def _database_reachable(eng: Engine | None = None) -> bool:
    """True if the API can run a trivial query; never exposes connection details."""
    target = eng or engine
    try:
        with target.begin() as conn:
            if conn.dialect.name == "postgresql":
                conn.execute(text("SET LOCAL statement_timeout = '2s'"))
            conn.execute(text("SELECT 1"))
    except Exception:
        return False
    return True


@router.get("/health")
def health_check(
    db: bool = Query(False, description="When true, include db_ok from SELECT 1 (no DSN in response)."),
    ops: bool = Query(
        False,
        description="When true, include non-secret ops flags (mail/calendar wiring) for deploy checks.",
    ),
) -> dict[str, str | bool | int]:
    commit = _git_commit_sha()
    out: dict[str, str | bool | int] = {
        "status": "ok",
        "service": "twin-api",
        "git_commit": commit if commit else "unknown",
    }
    if db:
        out["db_ok"] = _database_reachable()
    if ops:
        from app.config import get_settings
        from app.services.google_calendar_oauth import is_google_calendar_oauth_configured
        from app.services.mail import is_mail_configured
        from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured

        from app.api.public import _stripe_checkout_ready
        from app.core.scrape_ops import scrape_worker_ready

        s = get_settings()
        out["mail_configured"] = is_mail_configured(s)
        from app.services.auth_oauth_redirect import (
            effective_apple_redirect_uri,
            effective_github_redirect_uri,
            effective_google_redirect_uri,
        )
        from app.services.apple_oauth import is_apple_configured
        from app.services.github_oauth import is_github_configured
        from app.services.google_oauth import is_google_configured
        from app.services.microsoft_oauth import is_microsoft_configured
        from app.services.calendar_oauth_redirect import (
            effective_google_calendar_redirect_uri,
            effective_microsoft_calendar_redirect_uri,
        )

        out["google_oauth_configured"] = is_google_configured()
        out["github_oauth_configured"] = is_github_configured()
        out["apple_oauth_configured"] = is_apple_configured()
        out["microsoft_oauth_configured"] = is_microsoft_configured()
        out["google_redirect_uri"] = effective_google_redirect_uri(s)
        out["github_redirect_uri"] = effective_github_redirect_uri(s)
        out["apple_redirect_uri"] = effective_apple_redirect_uri(s)
        out["google_calendar_configured"] = is_google_calendar_oauth_configured()
        out["microsoft_calendar_configured"] = is_microsoft_calendar_oauth_configured()
        out["google_calendar_redirect_uri"] = effective_google_calendar_redirect_uri(s)
        out["microsoft_calendar_redirect_uri"] = effective_microsoft_calendar_redirect_uri(s)
        out["stripe_checkout_ready"] = _stripe_checkout_ready(s)
        out["scrape_worker_ready"] = scrape_worker_ready(s)
        out["scrape_beat_enabled"] = s.scrape_beat_enabled
        out["celery_task_always_eager"] = s.celery_task_always_eager
        try:
            from app.services.market_coverage_status import build_market_coverage_status
            from app.database.session import SessionLocal

            with SessionLocal() as db_sess:
                mc = build_market_coverage_status(db_sess)
            out["market_coverage_last_scrape_at"] = mc.get("last_scrape_run_at")
            out["market_coverage_progress_pct"] = mc.get("progress_to_10k_pct")
            out["market_coverage_active_validated"] = mc.get("active_validated_jobs")
            out["market_coverage_feed_stale"] = mc.get("feed_stale")
            warn = mc.get("warnings") or []
            out["market_coverage_warnings"] = ",".join(str(w) for w in warn[:8]) if warn else ""
            out["market_coverage_ops_hint"] = (
                "Feed stale — check SCRAPE_BEAT_ENABLED + worker beat schedule (docs/SCRAPE_OPS.md)"
                if mc.get("feed_stale")
                else "Market scrape beat OK — see GET /admin/market-coverage-status"
            )
        except Exception:
            out["market_coverage_ops_hint"] = "market_coverage_status_unavailable"
        out["recruiter_inbox_configured"] = bool((s.recruiter_inbox_token or "").strip())
        out["ops_admin_configured"] = bool(
            (s.ops_admin_token or "").strip() or (s.beta_admin_token or "").strip()
        )
        from app.services.linkedin_oauth import is_linkedin_oauth_configured

        out["linkedin_oauth_configured"] = is_linkedin_oauth_configured()
        s3_on = bool(
            (s.s3_bucket_name or "").strip()
            and (s.s3_access_key_id or "").strip()
            and (s.s3_secret_access_key or "").strip()
        )
        out["data_room_s3_enabled"] = s3_on
        out["data_room_local_demo"] = not s3_on and s.data_room_local_upload_enabled
        try:
            from app.database.session import SessionLocal
            from app.services.mvp_public_metrics import count_validated_jobs_public_traction
            from app.services.partner_auth import partner_export_configured

            with SessionLocal() as db:
                out["partner_export_configured"] = partner_export_configured(db, s)
                out["validated_jobs"] = count_validated_jobs_public_traction(db)
        except Exception:
            out["partner_export_configured"] = bool((s.partner_export_token or "").strip())
            out["validated_jobs"] = 0
    return out


@router.get("/health/celery-status")
def celery_status() -> dict[str, str | bool | list[str]]:
    """Celery worker reachability and nightly auto-apply beat wiring (no secrets)."""
    from app.config import get_settings
    from app.tasks.celery_app import celery_app

    from app.tasks.celery_app import apply_celery_runtime_config

    apply_celery_runtime_config()
    s = get_settings()
    schedule = celery_app.conf.beat_schedule or {}
    out: dict[str, str | bool | list[str]] = {
        "celery_task_always_eager": s.celery_task_always_eager,
        "broker_configured": bool((s.celery_broker_url or "").strip()),
        "nightly_auto_apply_beat_enabled": s.nightly_auto_apply_beat_enabled,
        "beat_schedule_has_nightly": "nightly-auto-apply" in schedule,
        "worker_active": False,
    }
    if s.celery_task_always_eager:
        out["worker_active"] = True
        out["mode"] = "eager"
        return out
    try:
        inspect = celery_app.control.inspect(timeout=4.0)
        ping = inspect.ping() if inspect else None
        if ping:
            out["worker_active"] = True
            out["worker_nodes"] = list(ping.keys())
        else:
            out["mode"] = "no_workers"
    except Exception as exc:
        out["error"] = str(exc)[:200]
        out["mode"] = "inspect_failed"
    return out
