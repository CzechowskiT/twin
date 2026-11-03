"""Internal-only career strategy execution orchestrator (never external agent)."""

from __future__ import annotations

import logging

from app.database.session import SessionLocal
from app.services import career_strategy as strat
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.career_strategy_tasks.run_internal_execution_plan")
def run_internal_execution_plan(candidate_id: int, plan_id: int) -> dict:
    """Resume/run candidate-controlled internal plan — blocks external steps."""
    db = SessionLocal()
    try:
        out = strat.run_execution_plan(
            db, candidate_id=int(candidate_id), plan_id=int(plan_id), resume=True
        )
        logger.info(
            "strategy_plan_run candidate_id=%s plan_id=%s status=%s",
            candidate_id,
            plan_id,
            (out.get("plan") or {}).get("status"),
        )
        return {"ok": True, "external": False, "result": out}
    except ValueError as exc:
        logger.warning(
            "strategy_plan_blocked candidate_id=%s plan_id=%s err=%s",
            candidate_id,
            plan_id,
            exc,
        )
        return {"ok": False, "external": False, "error": str(exc), "silent": False}
    finally:
        db.close()


@celery_app.task(name="app.tasks.career_strategy_tasks.run_deletion_job")
def run_deletion_job_task(candidate_id: int, preview_only: bool = False) -> dict:
    db = SessionLocal()
    try:
        job = strat.run_deletion_job(
            db, candidate_id=int(candidate_id), preview_only=bool(preview_only)
        )
        return {"ok": True, "job": job, "executed": not preview_only}
    finally:
        db.close()


@celery_app.task(name="app.tasks.career_strategy_tasks.run_privacy_revocation")
def run_privacy_revocation_task(candidate_id: int) -> dict:
    db = SessionLocal()
    try:
        job = strat.run_privacy_revocation(db, candidate_id=int(candidate_id))
        return {"ok": True, "job": job, "executed": bool(job.get("executed"))}
    finally:
        db.close()
