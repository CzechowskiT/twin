"""Celery tasks for evidence investment intelligence — no silent mutations / enrollment."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import evidence_investment_intelligence as eii
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.evidence_investment_tasks.refresh_health")
def refresh_health(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = eii.investment_health(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "silent": False,
            "skill_mastery_inferred": False,
            "external_purchase": False,
            "external_enrollment": False,
            "questions": out.get("questions"),
            "experiments": out.get("experiments"),
        }
    except Exception as exc:
        logger.exception("investment health refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
