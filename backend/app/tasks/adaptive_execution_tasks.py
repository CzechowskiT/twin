"""Celery tasks for adaptive execution intelligence — no silent mutations."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import adaptive_execution_intelligence as aei
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.adaptive_execution_tasks.refresh_quality")
def refresh_quality(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = aei.analyze_commitment_quality(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "silent": False,
            "productivity_score": None,
            "count": len(out.get("analyses") or []),
        }
    except Exception as exc:
        logger.exception("quality refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
