"""Celery: nightly autonomous auto-apply sweep."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.services.nightly_auto_apply import run_nightly_auto_apply_sweep
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.nightly_auto_apply.nightly_auto_apply_sweep",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def nightly_auto_apply_sweep(self, dry_run: bool = False) -> dict:
    """Run at 02:00 Europe/Warsaw when beat schedule is enabled."""
    settings = get_settings()
    if not settings.nightly_auto_apply_beat_enabled and not dry_run:
        logger.info("nightly_auto_apply_sweep skipped (beat disabled)")
        return {"skipped": True, "reason": "beat_disabled"}
    try:
        return run_nightly_auto_apply_sweep(dry_run=dry_run)
    except Exception as exc:
        logger.exception("nightly_auto_apply_sweep failed")
        raise self.retry(exc=exc) from exc
