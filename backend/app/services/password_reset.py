"""Epic 2.23 — extend password reset with atomic session-family revocation.

Enumeration-resistant request; single-use completion; no auto-mint session.
Synthetic/KPI-excluded users use mail sink (no real outbound).
"""

from __future__ import annotations

import hashlib
import json
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.security import hash_password
from app.database.models import (
    CandidateRecoverySecurityReceipt,
    PasswordResetToken,
    User,
)
from app.services.candidate_account_recovery_constants import (
    CANONICAL_SESSION_AUTHORITY,
    COMPLETION_SCHEMA_ID,
    CONTRACT_ID,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_RECOVERY,
    MFA_PASSKEYS,
    NO_AUTO_MINT_FROM_RECOVERY,
    PARALLEL_CREDENTIAL_STORE,
    PARALLEL_IDENTITY_STORE,
    PARALLEL_MANAGED_SESSION_STORE,
    PARALLEL_PASSWORD_RESET_STORE,
    PARALLEL_RECOVERY_CHANNEL,
    RECOVERY_SCHEMA_ID,
    STATE_ACTIVE,
    STATE_CANCELLED,
    STATE_USED,
)
from app.services.mail import is_mail_configured, send_password_reset_email

logger = logging.getLogger(__name__)

FORGOT_PASSWORD_ACK = (
    "If an account exists for that email, you will receive password reset instructions shortly."
)


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _flags() -> dict[str, bool]:
    s = get_settings()
    return {
        "v2": bool(getattr(s, "auth_recovery_v2_enabled", True)),
        "revoke": bool(getattr(s, "auth_recovery_v2_session_revoke", True)),
        "hash_links": bool(getattr(s, "auth_recovery_v2_hash_links", True)),
        "legacy_query": bool(getattr(s, "auth_legacy_reset_token_acceptance", True)),
    }


def catalog() -> dict:
    f = _flags()
    return {
        "schema_id": RECOVERY_SCHEMA_ID,
        "completion_schema_id": COMPLETION_SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "parallel_identity_store": PARALLEL_IDENTITY_STORE,
        "parallel_credential_store": PARALLEL_CREDENTIAL_STORE,
        "parallel_managed_session_store": PARALLEL_MANAGED_SESSION_STORE,
        "parallel_password_reset_store": PARALLEL_PASSWORD_RESET_STORE,
        "parallel_recovery_channel": PARALLEL_RECOVERY_CHANNEL,
        "canonical_session_authority": CANONICAL_SESSION_AUTHORITY,
        "mfa_passkeys": MFA_PASSKEYS,
        "first_value_satisfied_by_recovery": FIRST_VALUE_SATISFIED_BY_RECOVERY,
        "no_auto_mint_from_recovery": NO_AUTO_MINT_FROM_RECOVERY,
        "flags": f,
        "recovery_link_format": "hash_fragment" if f["hash_links"] else "query",
    }


def _reset_url(settings: Settings, raw_token: str) -> str:
    base = settings.frontend_url.rstrip("/")
    f = _flags()
    if f["hash_links"]:
        return f"{base}/reset-password#token={raw_token}"
    return f"{base}/reset-password?token={raw_token}"


def _is_development(settings: Settings) -> bool:
    return settings.environment.strip().lower() == "development"


def _add_receipt(db: Session, *, user_id: int, event_kind: str, payload: dict) -> None:
    db.add(
        CandidateRecoverySecurityReceipt(
            user_id=user_id,
            receipt_key=f"rcpt_{uuid.uuid4().hex}",
            event_kind=event_kind,
            payload_json=json.dumps(payload, separators=(",", ":")),
            created_at=_utcnow(),
            kpi_excluded=True,
        )
    )


def request_password_reset(db: Session, settings: Settings, email: str) -> str:
    """Create token if eligible user exists; send or sink. Always generic ack."""
    normalized = _normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized).first()
    if not user or not user.hashed_password or not user.is_active:
        return FORGOT_PASSWORD_ACK

    # Cancel prior active challenges (enumeration-safe; only for known user)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.state == STATE_ACTIVE,
    ).update(
        {
            PasswordResetToken.state: STATE_CANCELLED,
            PasswordResetToken.cancelled_at: _utcnow(),
        },
        synchronize_session=False,
    )

    raw = secrets.token_urlsafe(32)
    expires = _utcnow() + timedelta(minutes=settings.password_reset_token_ttl_minutes)
    kpi = bool(getattr(user, "exclude_from_product_metrics", False))
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw),
            expires_at=expires,
            created_at=_utcnow(),
            schema_version=RECOVERY_SCHEMA_ID,
            state=STATE_ACTIVE,
            kpi_excluded=kpi,
        )
    )
    db.commit()
    _add_receipt(
        db,
        user_id=user.id,
        event_kind="recovery_requested",
        payload={"token_fingerprint": hash_reset_token(raw)[:12]},
    )
    db.commit()

    url = _reset_url(settings, raw)
    # Synthetic sink — never send real mail for KPI-excluded accounts
    if kpi:
        logger.info(
            "Synthetic recovery sink fingerprint=%s user_id=%s",
            hash_reset_token(raw)[:12],
            user.id,
        )
        return FORGOT_PASSWORD_ACK

    if is_mail_configured(settings):
        try:
            send_password_reset_email(settings, to_email=user.email, reset_url=url)
        except Exception:
            logger.exception("Password reset email failed for user_id=%s", user.id)
            if settings.debug or _is_development(settings):
                logger.warning("Password reset link (after email send failure): %s", url)
    else:
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


def mint_synthetic_recovery_challenge(db: Session, *, user: User) -> dict:
    """Ops-only: issue recovery challenge for KPI-excluded synthetic user; return raw once."""
    if not getattr(user, "exclude_from_product_metrics", False):
        raise ValueError("synthetic_only")
    if not user.hashed_password or not user.is_active:
        raise ValueError("ineligible")
    settings = get_settings()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.state == STATE_ACTIVE,
    ).update(
        {
            PasswordResetToken.state: STATE_CANCELLED,
            PasswordResetToken.cancelled_at: _utcnow(),
        },
        synchronize_session=False,
    )
    raw = secrets.token_urlsafe(32)
    expires = _utcnow() + timedelta(minutes=settings.password_reset_token_ttl_minutes)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw),
            expires_at=expires,
            created_at=_utcnow(),
            schema_version=RECOVERY_SCHEMA_ID,
            state=STATE_ACTIVE,
            kpi_excluded=True,
        )
    )
    db.commit()
    return {
        "ok": True,
        "token_once": raw,
        "expires_at": expires.isoformat(),
        "schema_id": RECOVERY_SCHEMA_ID,
        "kpi_excluded": True,
        "mail_sent": False,
        "sink": "synthetic",
    }


def complete_recovery_with_token(db: Session, raw_token: str, new_password: str) -> dict | None:
    """Atomic: lock challenge → rotate password → revoke-all sessions/families → receipt.

    Does not mint a new session. Returns completion dict or None if invalid.
    """
    if not raw_token.strip() or len(new_password) < 8:
        return None
    digest = hash_reset_token(raw_token.strip())
    f = _flags()

    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == digest)
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        return None
    now = _utcnow()
    if row.expires_at.replace(tzinfo=None) <= now:
        return None
    state = getattr(row, "state", None) or STATE_ACTIVE
    if state != STATE_ACTIVE:
        # Legacy rows without state were deleted on use; reject used/cancelled
        if state in {STATE_USED, STATE_CANCELLED}:
            return None
        if not f["legacy_query"]:
            return None

    user = db.get(User, row.user_id)
    if not user or not user.is_active:
        row.state = STATE_CANCELLED
        row.cancelled_at = now
        db.commit()
        return None

    user.hashed_password = hash_password(new_password)
    row.state = STATE_USED
    row.used_at = now

    revoked_count = 0
    if f["v2"] and f["revoke"]:
        from app.services import candidate_auth_session as cas

        out = cas.revoke_everywhere(db, user_id=user.id)
        revoked_count = int(out.get("revoked_count") or 0)

    # Invalidate other active challenges for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.id != row.id,
        PasswordResetToken.state == STATE_ACTIVE,
    ).update(
        {
            PasswordResetToken.state: STATE_CANCELLED,
            PasswordResetToken.cancelled_at: now,
        },
        synchronize_session=False,
    )

    _add_receipt(
        db,
        user_id=user.id,
        event_kind="recovery_completed",
        payload={
            "sessions_revoked": revoked_count,
            "auto_mint": False,
            "token_fingerprint": digest[:12],
        },
    )
    db.commit()
    return {
        "schema_id": COMPLETION_SCHEMA_ID,
        "completed": True,
        "sessions_revoked": revoked_count,
        "auto_mint_session": False,
        "first_value_satisfied": False,
        "require_fresh_login": True,
    }


def reset_password_with_token(db: Session, raw_token: str, new_password: str) -> bool:
    """Back-compat wrapper used by /auth/reset-password."""
    result = complete_recovery_with_token(db, raw_token, new_password)
    return result is not None and bool(result.get("completed"))


def list_pending_recovery(db: Session, *, user_id: int) -> list[dict]:
    now = _utcnow()
    rows = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.state == STATE_ACTIVE,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.created_at.desc())
        .all()
    )
    out = []
    for row in rows:
        out.append(
            {
                "challenge_id": row.id,
                "access_key": f"recovery_pending:{row.id}",
                "state": STATE_ACTIVE,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "revision": f"recovery:{row.id}:{row.token_hash[:8]}",
                "token_fingerprint": row.token_hash[:12],
            }
        )
    return out


def cancel_pending_recovery(db: Session, *, user_id: int, challenge_id: int) -> dict:
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.id == challenge_id,
            PasswordResetToken.user_id == user_id,
        )
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise LookupError("recovery_not_found")
    if (getattr(row, "state", None) or STATE_ACTIVE) != STATE_ACTIVE:
        raise ValueError("not_active")
    row.state = STATE_CANCELLED
    row.cancelled_at = _utcnow()
    _add_receipt(
        db,
        user_id=user_id,
        event_kind="recovery_cancelled",
        payload={"challenge_id": challenge_id, "token_fingerprint": row.token_hash[:12]},
    )
    db.commit()
    return {"cancelled": True, "challenge_id": challenge_id}
