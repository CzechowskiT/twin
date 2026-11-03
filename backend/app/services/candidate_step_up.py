"""Epic 2.23 — purpose-bound step-up reauthentication (TTL≤5m).

No MFA/passkeys. Bound to session key + epoch when managed session present.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import verify_password
from app.database.models import CandidateStepUpChallenge, User
from app.services.candidate_account_recovery_constants import (
    FIRST_VALUE_SATISFIED_BY_STEP_UP,
    MFA_PASSKEYS,
    STATE_ACTIVE,
    STATE_USED,
    STEP_UP_PURPOSES,
    STEP_UP_SCHEMA_ID,
    STEP_UP_TTL_SECONDS,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _digest(raw: str) -> str:
    key = (get_settings().secret_key or "").encode("utf-8")
    return hmac.new(key, raw.encode("utf-8"), hashlib.sha256).hexdigest()


def catalog() -> dict[str, Any]:
    s = get_settings()
    return {
        "schema_id": STEP_UP_SCHEMA_ID,
        "purposes": sorted(STEP_UP_PURPOSES),
        "ttl_seconds": STEP_UP_TTL_SECONDS,
        "enforce": bool(getattr(s, "auth_step_up_enforce", True)),
        "mfa_passkeys": MFA_PASSKEYS,
        "first_value_satisfied_by_step_up": FIRST_VALUE_SATISFIED_BY_STEP_UP,
        "behavioral_scoring": False,
    }


def issue_step_up(
    db: Session,
    *,
    user: User,
    purpose: str,
    password: str,
    session_key: str | None,
    session_epoch: int | None,
) -> dict[str, Any]:
    purpose = (purpose or "").strip().upper()
    if purpose not in STEP_UP_PURPOSES:
        raise ValueError("purpose_not_allowlisted")
    if not user.hashed_password:
        raise ValueError("no_password_login")
    if not verify_password(password, user.hashed_password):
        raise ValueError("invalid_password")

    raw = secrets.token_urlsafe(32)
    now = _utcnow()
    row = CandidateStepUpChallenge(
        user_id=user.id,
        challenge_key=f"stu_{uuid.uuid4().hex}",
        token_digest=_digest(raw),
        purpose=purpose,
        session_key=session_key,
        session_epoch=session_epoch,
        state=STATE_ACTIVE,
        expires_at=now + timedelta(seconds=STEP_UP_TTL_SECONDS),
        created_at=now,
        kpi_excluded=bool(getattr(user, "exclude_from_product_metrics", False)),
    )
    db.add(row)
    db.commit()
    return {
        "schema_id": STEP_UP_SCHEMA_ID,
        "step_up_token_once": raw,
        "purpose": purpose,
        "expires_at": row.expires_at.isoformat(),
        "ttl_seconds": STEP_UP_TTL_SECONDS,
        "first_value_satisfied": False,
    }


def consume_step_up(
    db: Session,
    *,
    user: User,
    purpose: str,
    step_up_token: str,
    session_key: str | None,
    session_epoch: int | None,
) -> None:
    purpose = (purpose or "").strip().upper()
    if purpose not in STEP_UP_PURPOSES:
        raise ValueError("purpose_not_allowlisted")
    digest = _digest((step_up_token or "").strip())
    row = (
        db.query(CandidateStepUpChallenge)
        .filter(CandidateStepUpChallenge.token_digest == digest)
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise ValueError("step_up_invalid")
    if row.user_id != user.id:
        raise ValueError("step_up_invalid")
    if row.purpose != purpose:
        raise ValueError("step_up_purpose_mismatch")
    if row.state != STATE_ACTIVE:
        raise ValueError("step_up_used")
    if row.expires_at < _utcnow():
        raise ValueError("step_up_expired")
    if row.session_key and session_key and row.session_key != session_key:
        raise ValueError("step_up_session_mismatch")
    if (
        row.session_epoch is not None
        and session_epoch is not None
        and int(row.session_epoch) != int(session_epoch)
    ):
        raise ValueError("step_up_epoch_mismatch")
    row.state = STATE_USED
    row.used_at = _utcnow()
    db.commit()


def require_step_up_or_raise(
    db: Session,
    *,
    user: User,
    purpose: str,
    step_up_token: str | None,
    session_key: str | None,
    session_epoch: int | None,
) -> None:
    if not bool(getattr(get_settings(), "auth_step_up_enforce", True)):
        return
    if not step_up_token:
        raise ValueError("step_up_required")
    consume_step_up(
        db,
        user=user,
        purpose=purpose,
        step_up_token=step_up_token,
        session_key=session_key,
        session_epoch=session_epoch,
    )
