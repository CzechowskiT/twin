"""Celery tasks for interview reminders (email when mail is configured)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import ScheduledInterview, User
from app.database.session import SessionLocal
from app.services.interview_reminder_mail import send_interview_reminder_email_message
from app.services.mail import is_mail_configured
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _calendar_url(settings) -> str:
    base = (settings.frontend_url or "http://localhost:3000").rstrip("/")
    return f"{base}/dashboard/calendar"


@celery_app.task(name="app.tasks.reminder_tasks.send_interview_reminder_email")
def send_interview_reminder_email(interview_id: int) -> str:
    """Send one reminder for a scheduled interview; idempotent via reminder_email_sent_at."""
    settings = get_settings()
    if not is_mail_configured(settings):
        logger.debug("send_interview_reminder_email skipped interview_id=%s (mail off)", interview_id)
        return "skipped_no_mail"

    db: Session = SessionLocal()
    try:
        row = (
            db.query(ScheduledInterview, User)
            .join(User, User.id == ScheduledInterview.user_id)
            .filter(ScheduledInterview.id == interview_id)
            .first()
        )
        if not row:
            return "not_found"
        interview, user = row
        if interview.status == "cancelled":
            return "cancelled"
        if interview.reminder_email_sent_at is not None:
            return "already_sent"
        if not getattr(user, "email_interview_reminders", False):
            return "opt_out"
        if interview.interview_start <= datetime.utcnow():
            return "past"

        send_interview_reminder_email_message(
            settings,
            to_email=user.email,
            company_name=interview.company_name,
            job_title=interview.job_title,
            interview_start=interview.interview_start,
            meeting_link=interview.meeting_link,
            calendar_url=_calendar_url(settings),
        )
        interview.reminder_email_sent_at = datetime.utcnow()
        db.commit()
        return "sent"
    except Exception:
        db.rollback()
        logger.exception("send_interview_reminder_email failed interview_id=%s", interview_id)
        return "error"
    finally:
        db.close()


@celery_app.task(name="app.tasks.reminder_tasks.interview_reminders_sweep")
def interview_reminders_sweep() -> str:
    """Enqueue reminders for interviews starting in ~24h (window ±30m)."""
    settings = get_settings()
    if not is_mail_configured(settings):
        return "skipped_no_mail"
    hours = max(1, min(72, int(settings.interview_reminder_hours_before)))
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_start = now + timedelta(hours=hours) - timedelta(minutes=30)
    window_end = now + timedelta(hours=hours) + timedelta(minutes=30)

    db: Session = SessionLocal()
    try:
        ids = [
            r[0]
            for r in db.query(ScheduledInterview.id)
            .filter(
                ScheduledInterview.status != "cancelled",
                ScheduledInterview.reminder_email_sent_at.is_(None),
                ScheduledInterview.interview_start >= window_start,
                ScheduledInterview.interview_start <= window_end,
            )
            .all()
        ]
    finally:
        db.close()

    sent = 0
    for iid in ids:
        result = send_interview_reminder_email.delay(iid)
        if result is not None:
            sent += 1
    logger.info("interview_reminders_sweep queued=%s window_hours=%s", len(ids), hours)
    return f"queued={len(ids)}"
