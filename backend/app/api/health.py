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
) -> dict[str, str | bool]:
    commit = _git_commit_sha()
    out: dict[str, str | bool] = {
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
        out["google_calendar_configured"] = is_google_calendar_oauth_configured()
        out["microsoft_calendar_configured"] = is_microsoft_calendar_oauth_configured()
        out["stripe_checkout_ready"] = _stripe_checkout_ready(s)
        out["scrape_worker_ready"] = scrape_worker_ready(s)
        out["scrape_beat_enabled"] = s.scrape_beat_enabled
        out["celery_task_always_eager"] = s.celery_task_always_eager
        out["recruiter_inbox_configured"] = bool((s.recruiter_inbox_token or "").strip())
        out["ops_admin_configured"] = bool(
            (s.ops_admin_token or "").strip() or (s.beta_admin_token or "").strip()
        )
        out["partner_export_configured"] = bool((s.partner_export_token or "").strip())
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
        inspect = celery_app.control.inspect(timeout=2.0)
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
