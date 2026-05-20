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
        from app.services.mail import is_mail_configured
        from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured

        s = get_settings()
        out["mail_configured"] = is_mail_configured(s)
        out["microsoft_calendar_configured"] = is_microsoft_calendar_oauth_configured()
    return out
