"""Celery tasks for Agent Dispatcher polling + recovery."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.database.session import SessionLocal
from app.services.agent_dispatch.constants import ACTIVE_LOCK_STATUSES
from app.services.agent_dispatch.service import purge_expired_prompts, reconcile_run, recover_active_runs
from app.tasks.celery_app import celery_app
from sqlalchemy import select
from app.database.models import AgentDispatchRun

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.agent_dispatch_tasks.reconcile_active_dispatch_runs")
def reconcile_active_dispatch_runs() -> str:
    settings = get_settings()
    if not settings.agent_dispatch_poll_enabled:
        return "agent-dispatch-poll-disabled"
    db = SessionLocal()
    try:
        purged = purge_expired_prompts(db)
        rows = (
            db.execute(
                select(AgentDispatchRun.id).where(
                    AgentDispatchRun.status.in_(list(ACTIVE_LOCK_STATUSES))
                )
            )
            .scalars()
            .all()
        )
        ok = 0
        for run_id in rows:
            try:
                reconcile_run(db, settings, run_id)
                ok += 1
            except Exception:
                logger.exception("reconcile failed for %s", run_id)
        return f"reconciled={ok};purged_prompts={purged}"
    finally:
        db.close()


@celery_app.task(name="app.tasks.agent_dispatch_tasks.recover_dispatch_runs_on_startup")
def recover_dispatch_runs_on_startup() -> str:
    settings = get_settings()
    db = SessionLocal()
    try:
        result = recover_active_runs(db, settings)
        return f"recovered={result.get('reconciled', 0)}"
    finally:
        db.close()
