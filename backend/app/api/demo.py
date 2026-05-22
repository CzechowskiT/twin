"""Public read-only demo snapshot when DEMO_MODE_ENABLED (no auth, no writes)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.session import get_db
from app.schemas.demo import DemoSnapshotOut
from app.services.demo_snapshot import build_demo_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)


def _require_demo_mode(settings: Settings = Depends(get_settings)) -> Settings:
    if not settings.demo_mode_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return settings


@router.get("/snapshot", response_model=DemoSnapshotOut)
def demo_snapshot(
    db: Session = Depends(get_db),
    settings: Settings = Depends(_require_demo_mode),
) -> DemoSnapshotOut:
    """Anonymized feed for marketing /demo — no user email, ids optional, read-only."""
    try:
        return build_demo_snapshot(db, settings)
    except Exception as exc:
        logger.exception("GET /demo/snapshot failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from exc
