"""Email verification tokens (hashed, same pattern as password reset)."""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import EmailVerificationToken, User
from app.services.mail import is_mail_configured, send_email_verification_email

logger = logging.getLogger(__name__)

RESEND_ACK = "If your account needs verification, we sent a new link to your email."


def hash_verification_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _verify_url(settings: Settings, raw_token: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/verify-email?token={raw_token}"


def is_email_verified(user: User) -> bool:
    return user.email_verified_at is not None


def issue_verification_email(db: Session, settings: Settings, user: User) -> None:
    """Create token and send verification email (skip if already verified)."""
    if is_email_verified(user):
        return
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).delete()
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.email_verification_token_ttl_minutes)
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_verification_token(raw),
            expires_at=expires,
        )
    )
    db.commit()
    url = _verify_url(settings, raw)
    if is_mail_configured(settings):
        try:
            send_email_verification_email(settings, to_email=user.email, verify_url=url)
        except Exception:
            logger.exception("Verification email failed user_id=%s", user.id)
            if settings.debug or settings.environment.strip().lower() == "development":
                logger.warning("Verify link (mail failed): %s", url)
    else:
        logger.warning("Verify link (no mail configured): %s", url)


def verify_email_with_token(db: Session, raw_token: str) -> bool:
    if not raw_token.strip():
        return False
    digest = hash_verification_token(raw_token.strip())
    now = datetime.now(timezone.utc)
    row = (
        db.query(EmailVerificationToken)
        .filter(
            EmailVerificationToken.token_hash == digest,
            EmailVerificationToken.expires_at > now,
        )
        .first()
    )
    if not row:
        return False
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user:
        return False
    user.email_verified_at = now
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).delete()
    db.commit()
    return True


def resend_verification(db: Session, settings: Settings, user: User) -> str:
    if is_email_verified(user):
        return RESEND_ACK
    issue_verification_email(db, settings, user)
    return RESEND_ACK
