"""Company invite outbox worker — enrollment-gated delivery."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import company_wave3 as wave3
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.company_invite_tasks.process_company_invite_outbox")
def process_company_invite_outbox(limit: int = 20) -> dict:
    """Process queued company invites when EXTERNAL_PILOT_ENROLLMENT_ENABLED is true."""
    db = SessionLocal()
    try:
        result = wave3.process_queued_company_invites(db, limit=limit)
        logger.info(
            "company_invite_outbox processed=%s sent=%s skipped=%s reason=%s",
            result.get("processed"),
            result.get("sent"),
            result.get("skipped"),
            result.get("reason"),
        )
        return result
    finally:
        db.close()
