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
) -> dict[str, str | bool]:
    out: dict[str, str | bool] = {"status": "ok", "service": "twin-api"}
    commit = _git_commit_sha()
    if commit:
        out["git_commit"] = commit
    if db:
        out["db_ok"] = _database_reachable()
    return out
