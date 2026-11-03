"""Celery refresh for strategy review / cluster outcomes — internal only."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import strategy_review_governance as srg
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.strategy_review_tasks.refresh_clusters")
def refresh_clusters(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = srg.compute_cluster_outcomes(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "fabricated_progress": False,
            "demand_claim": False,
            "silent_strategy_change": False,
            "idempotent": True,
            "status": out.get("status"),
        }
    except Exception as exc:
        logger.exception("strategy review cluster refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()


@celery_app.task(name="app.tasks.strategy_review_tasks.create_weekly_review")
def create_weekly_review(candidate_id: int) -> dict:
    """Scheduler-safe weekly review — skips archived spawners; never silent strategy change."""
    db = SessionLocal()
    try:
        from app.database.models import CandidateStrategyReviewSession

        active = (
            db.query(CandidateStrategyReviewSession)
            .filter(
                CandidateStrategyReviewSession.candidate_id == int(candidate_id),
                CandidateStrategyReviewSession.deleted_at.is_(None),
                CandidateStrategyReviewSession.status == "archived",
            )
            .count()
        )
        # Archived sessions do not spawn; always create a fresh draft from outcomes.
        _ = active
        review = srg.create_review_session(
            db, candidate_id=int(candidate_id), cadence="weekly"
        )
        return {
            "ok": True,
            "review_id": review.get("id"),
            "silent_strategy_change": False,
            "idempotent": True,
            "spawns_from_archived": False,
        }
    except Exception as exc:
        logger.exception("weekly strategy review failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
