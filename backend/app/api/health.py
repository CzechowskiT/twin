"""Health check endpoints."""

from fastapi import APIRouter

from app.config import get_settings
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "twin-api"}


@router.get("/health/features")
def health_features() -> dict[str, bool]:
    """Non-secret capability flags for operators and dashboards."""
    s = get_settings()
    smtp_on = bool(s.smtp_host.strip()) and bool(s.smtp_from.strip())
    return {
        "google_calendar_oauth_configured": is_google_calendar_oauth_configured(),
        "smtp_configured": smtp_on,
    }
