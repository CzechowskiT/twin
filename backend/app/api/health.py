"""Health check endpoints."""

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.config import get_settings
from app.database.session import engine
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured

router = APIRouter()


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
    if db:
        out["db_ok"] = _database_reachable()
    return out


@router.get("/health/features")
def health_features(request: Request) -> dict[str, bool | str]:
    """Non-secret capability flags for operators (not for anonymous internet-wide reconnaissance).

    - If ``health_features_token`` is set: require header ``X-Twin-Health-Token`` with the same value
      or respond with 404 (no token echo).
    - Else in production/staging: return only ``{"status": "ok"}`` (no infra booleans).
    - In development/test: full boolean payload (local dashboards).
    """
    s = get_settings()
    expected = (getattr(s, "health_features_token", None) or "").strip()
    provided = (request.headers.get("X-Twin-Health-Token") or "").strip()
    if expected:
        if provided != expected:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    elif (s.environment or "").lower() not in ("development", "test"):
        return {"status": "ok"}

    smtp_on = bool(s.smtp_host.strip()) and bool(s.smtp_from.strip())
    return {
        "status": "ok",
        "google_calendar_oauth_configured": is_google_calendar_oauth_configured(),
        "smtp_configured": smtp_on,
        "database_reachable": _database_reachable(),
    }
