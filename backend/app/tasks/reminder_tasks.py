"""Celery tasks for interview reminders (email — wired when SMTP is ready)."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.reminder_tasks.send_interview_reminder_email")
def send_interview_reminder_email(interview_id: int) -> str:
    """Placeholder: send a reminder for a scheduled interview. No-op when SMTP is not configured."""
    settings = get_settings()
    if not settings.smtp_host.strip() or not settings.smtp_from.strip():
        logger.debug("send_interview_reminder_email skipped interview_id=%s (no SMTP)", interview_id)
        return "skipped_no_smtp"
    logger.info(
        "send_interview_reminder_email noop interview_id=%s (SMTP present; template send not implemented)",
        interview_id,
    )
    return "noop_smtp_configured"
