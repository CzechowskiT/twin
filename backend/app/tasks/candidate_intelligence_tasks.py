"""Celery task: AI Candidate Intelligence extraction pipeline."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import candidate_intelligence as intel
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.candidate_intelligence_tasks.run_candidate_intelligence_task")
def run_candidate_intelligence_task(
    candidate_id: int,
    job_id: int | None = None,
    force: bool = False,
) -> dict:
    db = SessionLocal()
    try:
        result = intel.run_extraction_pipeline(
            db, candidate_id=candidate_id, job_id=job_id, force=force
        )
        return {
            "ok": bool(result.get("ok")),
            "candidate_id": candidate_id,
            "cached": bool(result.get("cached")),
            "profile_id": result.get("profile_id"),
            "status": (result.get("profile") or {}).get("extraction_status"),
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("candidate_intelligence_task_failed")
        return {"ok": False, "error": type(exc).__name__, "candidate_id": candidate_id}
    finally:
        db.close()
