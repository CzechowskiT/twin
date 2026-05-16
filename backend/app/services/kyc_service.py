"""Persist identity verification state; never store document images or raw PII from Authologic."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import IdentityVerification, User
from app.services import authologic_client


def stable_authologic_user_key(user: User) -> str:
    """Opaque stable key returned with conversation payloads (pattern: ^[a-zA-Z0-9-_+=#@.:]+$)."""
    return f"twin-user-{user.id}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _minimal_summary(payload: dict[str, Any]) -> str:
    """Non-PII snapshot for debugging/support (status enums only)."""
    ident = ((payload.get("result") or {}) if isinstance(payload.get("result"), dict) else {}).get(
        "identity"
    )
    ident_status = ident.get("status") if isinstance(ident, dict) else None
    snap = {
        "conversation_status": payload.get("status"),
        "identity_status": ident_status,
    }
    return json.dumps(snap, separators=(",", ":"))


def identity_passed_from_conversation(payload: dict[str, Any]) -> bool:
    """True when Authologic reports a finished conversation with finished identity product."""
    if payload.get("status") != "FINISHED":
        return False
    result = payload.get("result")
    if not isinstance(result, dict):
        return False
    ident = result.get("identity")
    if not isinstance(ident, dict):
        return False
    return ident.get("status") == "FINISHED"


def start_verification_session(
    db: Session,
    user: User,
    settings: Settings,
) -> IdentityVerification:
    """Create Authologic conversation and persist a row (redirect_url for browser)."""
    user_key = stable_authologic_user_key(user)
    return_url = f"{settings.frontend_url.rstrip('/')}/dashboard/identity?conversation={{conversationId}}"

    callback_url: str | None = None
    base = settings.authologic_server_public_url.strip().rstrip("/")
    if base:
        token_q = ""
        if settings.authologic_callback_token.strip():
            tok = settings.authologic_callback_token.strip()
            token_q = f"&t={tok}"
        callback_url = (
            f"{base}/api/v1/kyc/authologic/callback"
            f"?conversation={{conversationId}}&target={{target}}&event={{event}}{token_q}"
        )

    try:
        payload = authologic_client.create_conversation(
            settings,
            user_key=user_key,
            return_url=return_url,
            callback_url=callback_url,
        )
    except authologic_client.AuthologicClientError:
        raise

    conv_id = str(payload.get("id") or "")
    if not conv_id:
        raise authologic_client.AuthologicClientError("Authologic response missing id")

    row = IdentityVerification(
        user_id=user.id,
        provider="authologic",
        conversation_id=conv_id,
        user_key=user_key,
        conversation_status=str(payload.get("status") or "") or None,
        identity_status=None,
        redirect_url=str(payload.get("url") or "") or None,
        summary_json=_minimal_summary(payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def sync_verification_for_conversation(
    db: Session,
    *,
    conversation_id: str,
    settings: Settings,
) -> IdentityVerification | None:
    """Pull latest state from Authologic; update row and user.identity_verified_at when passed."""
    row = (
        db.query(IdentityVerification)
        .filter(IdentityVerification.conversation_id == conversation_id)
        .first()
    )
    if not row:
        return None

    payload = authologic_client.get_conversation(settings, conversation_id)
    ident = ((payload.get("result") or {}).get("identity")) if isinstance(payload.get("result"), dict) else {}
    ident_status = ident.get("status") if isinstance(ident, dict) else None

    row.conversation_status = str(payload.get("status") or "") or None
    row.identity_status = str(ident_status) if ident_status is not None else None
    row.redirect_url = str(payload.get("url") or "") or row.redirect_url
    row.summary_json = _minimal_summary(payload)
    row.updated_at = _utcnow()

    user = db.query(User).filter(User.id == row.user_id).first()
    if user and identity_passed_from_conversation(payload):
        user.identity_verified_at = user.identity_verified_at or _utcnow()
    db.commit()
    db.refresh(row)
    return row
