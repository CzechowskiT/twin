"""Candidate invite tokens + registration allowlist bridge (Phase 2 hardening).

Never stores or logs plaintext invite secrets after mint response.
Emails at rest use Fernet ciphertext on intake rows.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateInviteToken,
    CandidatePilotAllowlist,
    CandidatePilotIntakeRow,
    CandidatePilotInvitationPack,
)
from app.services.token_crypto import decrypt_secret, encrypt_secret

TOKEN_TTL_DAYS = 14
MAX_VALIDATE_FAILS = 12
TOKEN_STATUS_ACTIVE = "ACTIVE"
TOKEN_STATUS_USED = "USED"
TOKEN_STATUS_REVOKED = "REVOKED"
TOKEN_STATUS_EXPIRED = "EXPIRED"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_email(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def mask_email(email: str) -> str:
    e = (email or "").strip().lower()
    if "@" not in e:
        return "***"
    local, domain = e.split("@", 1)
    keep = local[:2] if len(local) > 2 else (local[:1] if local else "*")
    return f"{keep}***@{domain}"


def encrypt_email(email: str) -> str:
    return encrypt_secret(email.strip().lower())


def decrypt_email(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return None
    try:
        return decrypt_secret(ciphertext).strip().lower()
    except Exception:  # noqa: BLE001
        return None


def email_allowed_for_register(db: Session, *, email: str, invite_token: str | None = None) -> bool:
    """Env allowlist OR DB allowlist OR valid invite token for this email."""
    h = hash_email(email)
    row = (
        db.query(CandidatePilotAllowlist)
        .filter(
            CandidatePilotAllowlist.email_hash == h,
            CandidatePilotAllowlist.active.is_(True),
        )
        .one_or_none()
    )
    if row is not None:
        return True
    if invite_token and invite_token.strip():
        ok, _ = validate_invite_token(db, email=email, raw_token=invite_token, consume=False)
        return ok
    return False


def validate_invite_token(
    db: Session,
    *,
    email: str,
    raw_token: str,
    consume: bool = False,
) -> tuple[bool, str]:
    """Validate invite token; rate-limits brute force via validate_fail_count."""
    # Epic 2.14 — redeem kill switch fail-closed (generation/send already gated)
    try:
        from app.services.pilot_runtime import assert_redeem_allowed

        ok_r, reason_r = assert_redeem_allowed(db)
        if not ok_r:
            return False, reason_r
    except Exception:
        return False, "runtime_redeem_check_failed"
    th = hash_token(raw_token)
    row = (
        db.query(CandidateInviteToken)
        .filter(CandidateInviteToken.token_hash == th)
        .one_or_none()
    )
    if row is None:
        return False, "invite_token_invalid"
    now = _utcnow()
    row.last_validate_at = now
    if row.status == TOKEN_STATUS_REVOKED or row.revoked_at is not None:
        db.add(row)
        db.commit()
        return False, "invite_token_revoked"
    if row.status == TOKEN_STATUS_USED or row.used_at is not None:
        db.add(row)
        db.commit()
        return False, "invite_token_used"
    if row.expires_at <= now or row.status == TOKEN_STATUS_EXPIRED:
        row.status = TOKEN_STATUS_EXPIRED
        db.add(row)
        db.commit()
        return False, "invite_token_expired"
    if int(row.validate_fail_count or 0) >= MAX_VALIDATE_FAILS:
        row.status = TOKEN_STATUS_REVOKED
        row.revoked_at = now
        db.add(row)
        db.commit()
        return False, "invite_token_locked"
    if row.email_hash != hash_email(email):
        row.validate_fail_count = int(row.validate_fail_count or 0) + 1
        db.add(row)
        db.commit()
        return False, "invite_token_email_mismatch"
    if consume:
        row.status = TOKEN_STATUS_USED
        row.used_at = now
    db.add(row)
    db.commit()
    return True, "ok"


def revoke_invite_token(db: Session, *, token_id: int) -> CandidateInviteToken | None:
    row = db.query(CandidateInviteToken).filter(CandidateInviteToken.id == token_id).one_or_none()
    if row is None:
        return None
    row.status = TOKEN_STATUS_REVOKED
    row.revoked_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def revoke_allowlist_email(db: Session, *, email: str) -> bool:
    h = hash_email(email)
    row = (
        db.query(CandidatePilotAllowlist)
        .filter(CandidatePilotAllowlist.email_hash == h)
        .one_or_none()
    )
    if row is None:
        return False
    row.active = False
    row.revoked_at = _utcnow()
    db.add(row)
    db.commit()
    return True


def mint_tokens_for_pack(
    db: Session,
    *,
    pack: CandidatePilotInvitationPack,
    intake_rows: list[CandidatePilotIntakeRow],
    ttl_days: int = TOKEN_TTL_DAYS,
) -> list[dict[str, Any]]:
    """Mint ACTIVE tokens + allowlist rows. Returns plaintext tokens once (caller must not log).

    Epic 2.10: real generation blocked by runtime + effective hard cap 0.
    """
    from app.services import pilot_hard_caps as caps
    from app.services import pilot_runtime as runtime

    gen_ok, gen_reason = runtime.assert_generation_allowed(db)
    if not gen_ok:
        raise RuntimeError(f"invite_generation_blocked:{gen_reason}")
    n = max(1, len(intake_rows))
    reserved, cap_reason = caps.try_reserve(db, bucket_key=caps.BUCKET_GENERATION, n=n)
    if not reserved:
        raise RuntimeError(f"invite_generation_cap:{cap_reason}")
    now = _utcnow()
    expires = now + timedelta(days=ttl_days)
    minted: list[dict[str, Any]] = []
    for intake in intake_rows:
        # Global dedup: skip if active allowlist already exists for this hash
        existing_allow = (
            db.query(CandidatePilotAllowlist)
            .filter(
                CandidatePilotAllowlist.email_hash == intake.email_hash,
                CandidatePilotAllowlist.active.is_(True),
            )
            .one_or_none()
        )
        if existing_allow is None:
            db.add(
                CandidatePilotAllowlist(
                    email_hash=intake.email_hash,
                    email_masked=intake.email_masked,
                    cohort_id=pack.cohort_id,
                    pack_id=pack.id,
                    source="founder_send",
                    active=True,
                    created_at=now,
                )
            )
        else:
            # Already invited globally — still mint a fresh token for resend path
            pass

        # Revoke prior ACTIVE tokens for same email_hash (resend / rotate)
        prior = (
            db.query(CandidateInviteToken)
            .filter(
                CandidateInviteToken.email_hash == intake.email_hash,
                CandidateInviteToken.status == TOKEN_STATUS_ACTIVE,
            )
            .all()
        )
        for p in prior:
            p.status = TOKEN_STATUS_REVOKED
            p.revoked_at = now
            db.add(p)

        raw = secrets.token_urlsafe(32)
        row = CandidateInviteToken(
            cohort_id=pack.cohort_id,
            pack_id=pack.id,
            intake_row_id=intake.id,
            email_hash=intake.email_hash,
            email_masked=intake.email_masked,
            token_hash=hash_token(raw),
            status=TOKEN_STATUS_ACTIVE,
            expires_at=expires,
            created_at=now,
        )
        db.add(row)
        db.flush()
        minted.append(
            {
                "token_id": row.id,
                "email_masked": intake.email_masked,
                "email_hash_prefix": intake.email_hash[:12],
                "invite_token": raw,
                "expires_at": expires.isoformat() + "Z",
                "register_hint": f"/register/candidate?invite={raw}",
            }
        )
    db.commit()
    return minted


def token_to_dict(row: CandidateInviteToken) -> dict[str, Any]:
    return {
        "id": row.id,
        "cohort_id": row.cohort_id,
        "pack_id": row.pack_id,
        "email_masked": row.email_masked,
        "email_hash_prefix": (row.email_hash or "")[:12],
        "status": row.status,
        "expires_at": row.expires_at.isoformat() + "Z" if row.expires_at else None,
        "revoked_at": row.revoked_at.isoformat() + "Z" if row.revoked_at else None,
        "used_at": row.used_at.isoformat() + "Z" if row.used_at else None,
        "validate_fail_count": int(row.validate_fail_count or 0),
    }


def hardening_invite_metrics(db: Session) -> dict[str, Any]:
    active = (
        db.query(CandidateInviteToken)
        .filter(CandidateInviteToken.status == TOKEN_STATUS_ACTIVE)
        .count()
    )
    used = (
        db.query(CandidateInviteToken)
        .filter(CandidateInviteToken.status == TOKEN_STATUS_USED)
        .count()
    )
    revoked = (
        db.query(CandidateInviteToken)
        .filter(CandidateInviteToken.status == TOKEN_STATUS_REVOKED)
        .count()
    )
    allow = (
        db.query(CandidatePilotAllowlist)
        .filter(CandidatePilotAllowlist.active.is_(True))
        .count()
    )
    return {
        "invite_tokens_active": active,
        "invite_tokens_used": used,
        "invite_tokens_revoked": revoked,
        "allowlist_active": allow,
        "kpi_excluded": True,
    }
