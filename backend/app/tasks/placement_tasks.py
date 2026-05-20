"""Celery tasks for placement retention (date-driven, no human ping-pong)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application
from app.database.session import SessionLocal
from app.services.placement_verification import PLACEMENT_VERIFIED
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.placement_tasks.placement_retention_sweep")
def placement_retention_sweep() -> str:
    """Count verified placements for future milestone emails (MVP: log only).

    Phase 2 will enqueue in-app nudges or transactional mail on user-supplied start dates.
    """
    db: Session = SessionLocal()
    try:
        count = (
            db.query(Application.id)
            .filter(
                Application.placement_state == PLACEMENT_VERIFIED,
                Application.placement_verified_at.isnot(None),
            )
            .count()
        )
        logger.info(
            "placement_retention_sweep verified_count=%s at=%s",
            count,
            datetime.now(timezone.utc).isoformat(),
        )
        return f"verified_placements={count}"
    finally:
        db.close()
