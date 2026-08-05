"""Celery tasks for execution calendar — internal only, no Graph write."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import decision_calendar_capacity as dcc
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.decision_calendar_tasks.refresh_capacity")
def refresh_capacity(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = dcc.compute_capacity(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "inferred_obligations": False,
            "fabricated_availability": False,
            "idempotent": True,
            "status": out.get("status"),
        }
    except Exception as exc:
        logger.exception("capacity refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
