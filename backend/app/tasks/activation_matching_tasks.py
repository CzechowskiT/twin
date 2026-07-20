"""Celery task: activation matching after onboarding."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services.activation_matching import mark_job_failed_exhausted, run_matching_job
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.activation_matching_tasks.run_activation_matching_task",
    bind=True,
    max_retries=3,
    default_retry_delay=15,
    acks_late=True,
)
def run_activation_matching_task(self, job_id: int) -> str:
    db = SessionLocal()
    try:
        return run_matching_job(db, job_id)
    except Exception as exc:
        logger.exception("activation_matching_task_error", extra={"job_id": job_id})
        # Validation returns without raise; only transient reaches here
        try:
            if self.request.retries >= self.max_retries:
                mark_job_failed_exhausted(db, job_id)
                return "failed_exhausted"
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            mark_job_failed_exhausted(db, job_id)
            return "failed_exhausted"
    finally:
        db.close()
