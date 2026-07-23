"""Health check endpoints."""
# Launch readiness handoff 2026-07-23 (execution pack + decision record; force Railway SHA).


import os

from fastapi import APIRouter, Query
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.database.session import engine
from app.services.health_ops import build_health_ops_admin_extensions, build_health_ops_public

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
        description="When true, include non-secret ops booleans for deploy checks and /status.",
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

        out.update(build_health_ops_public(get_settings()))
    return out


@router.get("/health/celery-status")
def celery_status() -> dict[str, str | bool | list[str]]:
    """Celery worker reachability and nightly auto-apply beat wiring (no secrets)."""
    from app.config import get_settings
    from app.tasks.celery_app import (
        _configure_beat_schedule,
        apply_celery_runtime_config,
        celery_app,
    )

    apply_celery_runtime_config()
    _configure_beat_schedule()
    s = get_settings()
    schedule = celery_app.conf.beat_schedule or {}
    market_tasks = sorted(k for k in schedule if k.startswith("market-scrape-"))
    out: dict[str, str | bool | list[str]] = {
        "celery_task_always_eager": s.celery_task_always_eager,
        "broker_configured": bool((s.celery_broker_url or "").strip()),
        "scrape_beat_enabled": s.scrape_beat_enabled,
        "nightly_auto_apply_beat_enabled": s.nightly_auto_apply_beat_enabled,
        "beat_schedule_has_nightly": "nightly-auto-apply" in schedule,
        "beat_schedule_has_market_scrape_pl": "market-scrape-pl-daily" in schedule,
        "beat_schedule_market_tasks": market_tasks,
        "worker_active": False,
    }
    if s.celery_task_always_eager:
        out["worker_active"] = True
        out["mode"] = "eager"
        out["worker_git_commit"] = _git_commit_sha() or "unknown"
        return out
    try:
        inspect = celery_app.control.inspect(timeout=4.0)
        ping = inspect.ping() if inspect else None
        if ping:
            out["worker_active"] = True
            out["worker_nodes"] = list(ping.keys())
            # Ask a live worker for its deploy SHA (strict Gate F alignment).
            try:
                from app.tasks.worker_identity import worker_identity

                async_result = worker_identity.apply_async()
                identity = async_result.get(timeout=3.0)
                if isinstance(identity, dict) and identity.get("git_commit"):
                    out["worker_git_commit"] = str(identity["git_commit"])[:64]
            except Exception as identity_exc:
                out["worker_git_commit"] = "unknown"
                out["worker_identity_error"] = str(identity_exc)[:160]
        else:
            out["mode"] = "no_workers"
            out["worker_git_commit"] = "unknown"
    except Exception as exc:
        out["error"] = str(exc)[:200]
        out["mode"] = "inspect_failed"
        out["worker_git_commit"] = "unknown"
    return out
