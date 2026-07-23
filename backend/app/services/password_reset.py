"""Password reset token lifecycle (hashed tokens, no user enumeration)."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings
from app.core.security import hash_password
from app.database.models import PasswordResetToken, User
from app.services.mail import is_mail_configured, send_password_reset_email

logger = logging.getLogger(__name__)

FORGOT_PASSWORD_ACK = (
    "If an account exists for that email, you will receive password reset instructions shortly."
)


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _reset_url(settings: Settings, raw_token: str) -> str:
    base = settings.frontend_url.rstrip("/")
    return f"{base}/reset-password?token={raw_token}"


def _is_development(settings: Settings) -> bool:
    return settings.environment.strip().lower() == "development"


def request_password_reset(db: Session, settings: Settings, email: str) -> str:
    """Create token if eligible user exists; send or log. Always returns generic ack message."""
    normalized = _normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized).first()
    if not user or not user.hashed_password or not user.is_active:
        return FORGOT_PASSWORD_ACK

    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_token_ttl_minutes)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw),
            expires_at=expires,
        )
    )
    db.commit()

    url = _reset_url(settings, raw)
    if is_mail_configured(settings):
        try:
            send_password_reset_email(settings, to_email=user.email, reset_url=url)
        except Exception:
            logger.exception("Password reset email failed for user_id=%s", user.id)
            if settings.debug or _is_development(settings):
                logger.warning("Password reset link (after email send failure): %s", url)
    else:
        # Never log raw reset URLs outside development/debug — log fingerprint only.
        if settings.debug or _is_development(settings):
            logger.warning(
                "Password reset link (no mail configured; set SMTP_* or RESEND_API_KEY + MAIL_FROM): %s",
                url,
            )
        else:
            logger.warning(
                "Password reset mail not configured; token fingerprint=%s user_id=%s",
                hash_reset_token(raw)[:12],
                user.id,
            )

    return FORGOT_PASSWORD_ACK


def reset_password_with_token(db: Session, raw_token: str, new_password: str) -> bool:
    """Update password if token valid. Returns False for any invalid/expired case."""
    if not raw_token.strip():
        return False
    digest = hash_reset_token(raw_token.strip())
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == digest,
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not row:
        return False

    user = db.get(User, row.user_id)
    if not user:
        db.delete(row)
        db.commit()
        return False

    user.hashed_password = hash_password(new_password)
    db.delete(row)
    db.commit()
    return True
