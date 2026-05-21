"""Celery tasks for lifecycle and digest emails."""

import logging

from app.config import get_settings
from app.database.session import SessionLocal
from app.services.product_notifications import send_weekly_digest_email, weekly_digest_recipients
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.notification_tasks.send_welcome_email_task")
def send_welcome_email_task(user_id: int) -> str:
    from app.database.models import User
    from app.services.product_notifications import send_welcome_email

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return "missing_user"
        return "sent" if send_welcome_email(db, user) else "skipped"
    finally:
        db.close()


@celery_app.task(name="app.tasks.notification_tasks.weekly_product_digest_sweep")
def weekly_product_digest_sweep() -> str:
    settings = get_settings()
    if not settings.weekly_digest_beat_enabled:
        return "disabled"
    db = SessionLocal()
    sent = 0
    try:
        for user, count in weekly_digest_recipients(db):
            if send_weekly_digest_email(db, user, new_matches=count):
                sent += 1
    finally:
        db.close()
    return f"weekly_digests={sent}"
