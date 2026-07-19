"""Celery tasks for Founder Command Center durable loop."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.database.session import SessionLocal
from app.services.founder_command.execution_loop import list_active_command_ids, tick_command
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.founder_command_tasks.tick_founder_command",
    acks_late=True,
    reject_on_worker_lost=True,
)
def tick_founder_command(command_id: str) -> str:
    settings = get_settings()
    db = SessionLocal()
    try:
        cmd = tick_command(db, settings, command_id, actor_fingerprint="celery")
        from app.services.founder_command.constants import (
            ACTIVE_COMMAND_STATUSES,
            CommandStatus,
        )

        if cmd.status in ACTIVE_COMMAND_STATUSES - {
            CommandStatus.PAUSED.value,
            CommandStatus.AWAITING_APPROVAL.value,
        }:
            # Avoid recursive explosion under CELERY_TASK_ALWAYS_EAGER.
            if not getattr(celery_app.conf, "task_always_eager", False):
                tick_founder_command.apply_async(args=[command_id], countdown=15)
        return f"command_id={cmd.id};status={cmd.status};stage={cmd.current_stage}"
    finally:
        db.close()


@celery_app.task(name="app.tasks.founder_command_tasks.reconcile_founder_commands")
def reconcile_founder_commands() -> str:
    settings = get_settings()
    if not settings.founder_command_enabled:
        return "founder-command-disabled"
    db = SessionLocal()
    try:
        ids = list_active_command_ids(db)
        ok = 0
        for cid in ids:
            try:
                tick_command(db, settings, cid, actor_fingerprint="celery-beat")
                ok += 1
            except Exception:
                logger.exception("founder command tick failed for %s", cid)
        return f"ticked={ok}"
    finally:
        db.close()
