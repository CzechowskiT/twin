"""Optional Celery task to persist requirements split (stub when broker unavailable)."""

from __future__ import annotations

import json
import logging

from app.database.models import Job
from app.database.session import SessionLocal
from app.services.requirements_split import split_requirements
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="twin.split_job_requirements")
def split_job_requirements_task(job_id: int) -> dict[str, int]:
    """Parse requirements text and store must/nice columns for one job."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or not job.requirements:
            return {"job_id": job_id, "updated": 0}
        must, nice = split_requirements(job.requirements)
        job.requirements_must_have = json.dumps(must, ensure_ascii=False)
        job.requirements_nice_to_have = json.dumps(nice, ensure_ascii=False)
        db.commit()
        return {"job_id": job_id, "updated": 1}
    except Exception:
        logger.exception("split_job_requirements failed job_id=%s", job_id)
        db.rollback()
        raise
    finally:
        db.close()
