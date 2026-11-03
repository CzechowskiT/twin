"""Celery task: AI Candidate Intelligence extraction pipeline."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import candidate_intelligence as intel
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="app.tasks.candidate_intelligence_tasks.run_candidate_intelligence_task",
    max_retries=3,
    soft_time_limit=120,
    time_limit=180,
    acks_late=True,
)
def run_candidate_intelligence_task(
    self,
    candidate_id: int,
    job_id: int | None = None,
    force: bool = False,
) -> dict:
    db = SessionLocal()
    try:
        result = intel.run_extraction_pipeline(
            db, candidate_id=candidate_id, job_id=job_id, force=force
        )
        if not result.get("ok") and result.get("error") not in {
            "candidate_not_found",
            "candidate_intelligence_disabled",
        }:
            # Retry transient pipeline failures; terminal status already set to failed
            raise RuntimeError(result.get("error") or "intelligence_failed")
        return {
            "ok": bool(result.get("ok")),
            "candidate_id": candidate_id,
            "cached": bool(result.get("cached")),
            "profile_id": result.get("profile_id"),
            "status": result.get("status")
            or (result.get("profile") or {}).get("extraction_status"),
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("candidate_intelligence_task_failed")
        try:
            # Ensure failed is visible even if pipeline crashed before status write
            from app.database.models import Candidate, CandidateIntelligenceProfile

            cand = db.query(Candidate).filter(Candidate.id == candidate_id).one_or_none()
            if cand is not None:
                profile = (
                    db.query(CandidateIntelligenceProfile)
                    .filter(CandidateIntelligenceProfile.candidate_id == cand.id)
                    .one_or_none()
                )
                if profile is not None and profile.extraction_status == intel.STATUS_RUNNING:
                    profile.extraction_status = intel.STATUS_FAILED
                    db.add(profile)
                    db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
        try:
            raise self.retry(exc=exc, countdown=min(30 * (2 ** int(self.request.retries or 0)), 300))
        except Exception as retry_exc:  # noqa: BLE001
            # MaxRetriesExceededError or retry disabled
            return {
                "ok": False,
                "error": type(exc).__name__,
                "retry_error": type(retry_exc).__name__,
                "candidate_id": candidate_id,
            }
    finally:
        db.close()
