"""Health check endpoints."""

from fastapi import APIRouter, Query
from sqlalchemy import text

from app.config import get_settings
from app.database.session import SessionLocal
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured

router = APIRouter()


def _database_reachable() -> bool:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        db.close()


@router.get("/health")
def health_check(db: bool = Query(False, description="When true, include db_ok from SELECT 1 (no DSN in response).")) -> dict[str, str | bool]:
    out: dict[str, str | bool] = {"status": "ok", "service": "twin-api"}
    if db:
        out["db_ok"] = _database_reachable()
    return out


@router.get("/health/features")
def health_features() -> dict[str, bool]:
    """Non-secret capability flags for operators and dashboards."""
    s = get_settings()
    smtp_on = bool(s.smtp_host.strip()) and bool(s.smtp_from.strip())
    return {
        "google_calendar_oauth_configured": is_google_calendar_oauth_configured(),
        "smtp_configured": smtp_on,
    }
