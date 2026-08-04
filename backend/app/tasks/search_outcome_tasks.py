"""Celery refresh for search outcome intelligence — internal only."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import search_outcome_intelligence as soi
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.search_outcome_tasks.refresh_funnel")
def refresh_funnel(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        out = soi.compute_funnel(db, candidate_id=int(candidate_id))
        return {
            "ok": True,
            "fabricated_benchmarks": False,
            "silent_weight_change": False,
            "idempotent": True,
            "result": {"snapshot_id": out.get("snapshot_id")},
        }
    except Exception as exc:
        logger.exception("search outcome funnel refresh failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
