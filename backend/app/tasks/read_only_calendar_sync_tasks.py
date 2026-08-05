"""Celery tasks for read-only calendar sync — never Graph write."""

from __future__ import annotations

import logging

from app.database.models import Candidate
from app.database.session import SessionLocal
from app.services import read_only_calendar_sync as rocs
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.read_only_calendar_sync_tasks.scheduled_busy_sync")
def scheduled_busy_sync(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        cand = db.query(Candidate).filter_by(id=int(candidate_id)).one_or_none()
        if not cand:
            return {"ok": False, "error": "candidate_not_found"}
        out = rocs.run_sync(
            db,
            candidate_id=cand.id,
            user_id=cand.user_id,
            synthetic_busy=None,
            idempotency_key=f"sched:{candidate_id}",
        )
        return {
            "ok": True,
            "idempotent": bool(out.get("idempotent")),
            "silent_approved_plan_rewrite": False,
            "external_created": False,
            "mode": (out.get("sync_run") or {}).get("mode"),
        }
    except Exception as exc:
        logger.exception("scheduled busy sync failed: %s", exc)
        return {"ok": False, "silent": False, "error": type(exc).__name__}
    finally:
        db.close()
