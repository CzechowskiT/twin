"""Lifecycle emails: welcome, first match, weekly digest (opt-in product updates)."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import JobMatch, User
from app.services.mail import is_mail_configured, send_generic_email

logger = logging.getLogger(__name__)


def _frontend_base(settings: Settings) -> str:
    return (settings.frontend_url or "http://localhost:3000").rstrip("/")


def send_welcome_email(db: Session, user: User) -> bool:
    """Send once after registration when mail is configured."""
    if user.welcome_email_sent_at:
        return False
    settings = get_settings()
    if not is_mail_configured(settings):
        return False
    base = _frontend_base(settings)
    subject = "Welcome to TWIN — your career agent is on"
    text = (
        f"Hi,\n\nYour TWIN account ({user.email}) is ready.\n\n"
        f"Finish setup: {base}/onboarding\n"
        f"Dashboard: {base}/dashboard\n\n"
        "We match roles while you focus on interviews worth showing up for.\n"
    )
    html = (
        "<p>Your TWIN account is ready.</p>"
        f'<p><a href="{base}/onboarding">Finish onboarding</a> · '
        f'<a href="{base}/dashboard">Open dashboard</a></p>'
        "<p>We surface matched roles — not inbox noise.</p>"
    )
    try:
        send_generic_email(settings, to_email=user.email, subject=subject, text_body=text, html_body=html)
    except Exception:
        logger.exception("welcome email failed user_id=%s", user.id)
        return False
    user.welcome_email_sent_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    return True


def send_first_match_email(db: Session, user: User, *, match_count: int) -> bool:
    if user.first_match_email_sent_at or match_count < 1:
        return False
    settings = get_settings()
    if not is_mail_configured(settings):
        return False
    base = _frontend_base(settings)
    subject = "Your first TWIN matches are ready"
    text = (
        f"TWIN found {match_count} role(s) aligned with your profile.\n\n"
        f"Review them: {base}/dashboard\n"
    )
    html = (
        f"<p>TWIN found <strong>{match_count}</strong> matched role(s) for you.</p>"
        f'<p><a href="{base}/dashboard">Open your pipeline</a></p>'
    )
    try:
        send_generic_email(settings, to_email=user.email, subject=subject, text_body=text, html_body=html)
    except Exception:
        logger.exception("first match email failed user_id=%s", user.id)
        return False
    user.first_match_email_sent_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    return True


def maybe_send_first_match_after_match(db: Session, *, candidate_id: int, user_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    count = db.query(JobMatch).filter(JobMatch.candidate_id == candidate_id).count()
    if count >= 1:
        send_first_match_email(db, user, match_count=count)


def send_weekly_digest_email(db: Session, user: User, *, new_matches: int) -> bool:
    if not user.email_product_updates:
        return False
    settings = get_settings()
    if not is_mail_configured(settings):
        return False
    base = _frontend_base(settings)
    subject = "Your weekly TWIN update"
    text = (
        f"This week TWIN logged {new_matches} new match(es) for your profile.\n\n"
        f"Pipeline: {base}/dashboard\n"
    )
    html = (
        f"<p>This week: <strong>{new_matches}</strong> new match(es).</p>"
        f'<p><a href="{base}/dashboard">View pipeline</a></p>'
    )
    try:
        send_generic_email(settings, to_email=user.email, subject=subject, text_body=text, html_body=html)
    except Exception:
        logger.exception("weekly digest failed user_id=%s", user.id)
        return False
    return True


def weekly_digest_recipients(db: Session) -> list[tuple[User, int]]:
    """Users opted into product updates with matches in the last 7 days."""
    from sqlalchemy import func

    from app.database.models import Candidate

    since = datetime.utcnow() - timedelta(days=7)
    rows = (
        db.query(User, func.count(JobMatch.id))
        .join(Candidate, Candidate.user_id == User.id)
        .join(JobMatch, JobMatch.candidate_id == Candidate.id)
        .filter(User.email_product_updates.is_(True), JobMatch.created_at >= since)
        .group_by(User.id)
        .all()
    )
    return [(user, int(count)) for user, count in rows]
