"""Celery tasks for interview + Daily Career OS reminders (consent-safe)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from celery.exceptions import MaxRetriesExceededError

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


@celery_app.task(
    bind=True,
    name="app.tasks.reminder_tasks.deliver_career_reminder",
    max_retries=3,
    default_retry_delay=90,
    acks_late=True,
)
def deliver_career_reminder_task(self, reminder_id: int, dry_run: bool = False) -> dict:
    """Deliver one Daily OS reminder; retries on hard failure; never silent."""
    from app.services import career_daily_os as daily_os

    db: Session = SessionLocal()
    try:
        out = daily_os.deliver_career_reminder(
            db, reminder_id=int(reminder_id), dry_run=bool(dry_run)
        )
        if not out.get("ok") and out.get("result") in {"failed_email", "failed_in_product"}:
            raise RuntimeError(str(out.get("result")))
        return out
    except Exception as exc:
        logger.exception("deliver_career_reminder_task failed id=%s", reminder_id)
        try:
            raise self.retry(exc=exc)
        except MaxRetriesExceededError:
            return {
                "ok": False,
                "result": "max_retries_exceeded",
                "reminder_id": reminder_id,
                "visible_failure": True,
                "error": type(exc).__name__,
            }
    finally:
        db.close()


@celery_app.task(name="app.tasks.reminder_tasks.career_reminders_sweep")
def career_reminders_sweep(dry_run: bool = False, limit: int = 100) -> dict:
    """Enqueue due CandidateCareerReminder deliveries on the worker (consent-safe)."""
    from app.database.models import CandidateCareerReminder
    from app.services import career_daily_os as daily_os

    if dry_run:
        db: Session = SessionLocal()
        try:
            return daily_os.sweep_due_career_reminders(db, dry_run=True, limit=int(limit))
        finally:
            db.close()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db = SessionLocal()
    try:
        ids = [
            r.id
            for r in db.query(CandidateCareerReminder)
            .filter(
                CandidateCareerReminder.status == "scheduled",
                CandidateCareerReminder.due_at <= now,
            )
            .order_by(CandidateCareerReminder.due_at.asc())
            .limit(max(1, min(500, int(limit))))
            .all()
        ]
    finally:
        db.close()

    queued = 0
    for rid in ids:
        deliver_career_reminder_task.delay(int(rid), False)
        queued += 1
    logger.info("career_reminders_sweep queued=%s", queued)
    return {
        "ok": True,
        "dry_run": False,
        "queued": queued,
        "reminder_ids": ids[:50],
        "kpi_excluded": True,
        "mass_email": False,
    }
