"""Celery tasks for placement retention (date-driven, no human ping-pong)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Application, Candidate, PlacementEvent, User
from app.database.session import SessionLocal
from app.services.mail import is_mail_configured
from app.services.placement_retention_mail import send_placement_retention_welcome_email
from app.services.placement_verification import PLACEMENT_VERIFIED, record_placement_event
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

_RETENTION_EMAIL_EVENT = "retention_welcome_email"


@celery_app.task(name="app.tasks.placement_tasks.placement_retention_sweep")
def placement_retention_sweep() -> str:
    """Count verified placements; send one-time retention welcome when mail is configured."""
    settings = get_settings()
    db: Session = SessionLocal()
    mailed = 0
    try:
        count = (
            db.query(Application.id)
            .filter(
                Application.placement_state == PLACEMENT_VERIFIED,
                Application.placement_verified_at.isnot(None),
            )
            .count()
        )
        if is_mail_configured(settings):
            mailed = _send_retention_welcome_batch(db, settings)
        logger.info(
            "placement_retention_sweep verified_count=%s retention_emails=%s at=%s",
            count,
            mailed,
            datetime.now(timezone.utc).isoformat(),
        )
        return f"verified_placements={count} retention_emails={mailed}"
    finally:
        db.close()


def _send_retention_welcome_batch(db: Session, settings) -> int:
    """Email users whose placement was verified in the last 48h (once per application)."""
    since = datetime.utcnow() - timedelta(hours=48)
    rows = (
        db.query(Application, User, Candidate)
        .join(Candidate, Candidate.id == Application.candidate_id)
        .join(User, User.id == Candidate.user_id)
        .filter(
            Application.placement_state == PLACEMENT_VERIFIED,
            Application.placement_verified_at.isnot(None),
            Application.placement_verified_at >= since,
        )
        .all()
    )
    dashboard = f"{(settings.frontend_url or 'http://localhost:3000').rstrip('/')}/dashboard"
    sent = 0
    for app, user, _cand in rows:
        already = (
            db.query(PlacementEvent.id)
            .filter(
                PlacementEvent.application_id == app.id,
                PlacementEvent.event_type == _RETENTION_EMAIL_EVENT,
            )
            .first()
        )
        if already:
            continue
        job_title = "your role"
        company = "the company"
        if app.job_id:
            from app.database.models import Job

            job = db.get(Job, app.job_id)
            if job:
                job_title = job.title or job_title
                company = job.company or company
        try:
            send_placement_retention_welcome_email(
                settings,
                to_email=user.email,
                company_name=company,
                job_title=job_title,
                dashboard_url=dashboard,
            )
            record_placement_event(
                db,
                application_id=app.id,
                event_type=_RETENTION_EMAIL_EVENT,
                actor="system",
                owner_user_id=user.id,
            )
            db.commit()
            sent += 1
        except Exception:
            db.rollback()
            logger.exception("retention welcome email failed application_id=%s", app.id)
    return sent
