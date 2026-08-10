"""Epic 2.22 — managed candidate account sessions + refresh families.

Signature alone is insufficient for managed tokens: sid + epoch rechecked in DB.
Legacy JWT (sub+exp only) accepted until original expiry when flag allows.
Never stores raw refresh tokens, passwords, IP, UA, or device identifiers.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import create_access_token_claims, decode_access_token_claims
from app.database.models import CandidateAuthSession, CandidateRefreshTokenFamily, User
from app.services.candidate_auth_session_constants import (
    ACCESS_TOKEN_TYP,
    CANONICAL_SESSION_AUTHORITY,
    CONTRACT_ID,
    DEFAULT_REFRESH_TTL_DAYS,
    EIGHTH_PRIMARY_NAV,
    FINGERPRINTING,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_AUTH_SESSION,
    LEGACY_TOKEN_ACCEPTANCE,
    MANAGED_CLAIM_EPOCH,
    MANAGED_CLAIM_SID,
    MANAGED_CLAIM_TYP,
    NO_MASS_FORCED_LOGOUT,
    PARALLEL_CREDENTIAL_STORE,
    PARALLEL_IDENTITY_STORE,
    REFRESH_FAMILY_SCHEMA_ID,
    SECURITY_SCORING,
    SECURITY_STATE_SCHEMA_ID,
    SESSION_SCHEMA_ID,
    STATE_ACTIVE,
    STATE_REVOKED,
    STATE_REUSE_SUSPECTED,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _flags() -> dict[str, bool]:
    s = get_settings()
    return {
        "mint": bool(getattr(s, "auth_managed_session_mint", True)),
        "verify": bool(getattr(s, "auth_managed_session_verify", True)),
        "enforce": bool(getattr(s, "auth_managed_session_enforce", True)),
        "refresh_rotation": bool(getattr(s, "auth_refresh_rotation", True)),
        "reuse_detection": bool(getattr(s, "auth_refresh_reuse_detection", True)),
        "legacy_accept": bool(getattr(s, "auth_legacy_token_acceptance", True)),
    }


def catalog() -> dict[str, Any]:
    f = _flags()
    return {
        "schema_id": SESSION_SCHEMA_ID,
        "refresh_family_schema_id": REFRESH_FAMILY_SCHEMA_ID,
        "security_state_schema_id": SECURITY_STATE_SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "parallel_identity_store": PARALLEL_IDENTITY_STORE,
        "parallel_credential_store": PARALLEL_CREDENTIAL_STORE,
        "canonical_session_authority": CANONICAL_SESSION_AUTHORITY,
        "no_mass_forced_logout": NO_MASS_FORCED_LOGOUT,
        "legacy_token_acceptance": LEGACY_TOKEN_ACCEPTANCE,
        "first_value_satisfied_by_auth_session": FIRST_VALUE_SATISFIED_BY_AUTH_SESSION,
        "fingerprinting": FINGERPRINTING,
        "security_scoring": SECURITY_SCORING,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "flags": f,
        "provider_reuse_gate": "BUILD_INTERNAL_MANAGED_SESSION_LAYER",
        "recovery": {
            "kind": "link_existing_idp_only",
            "password_reset_path": "/forgot-password",
            "note": "No new IdP/MFA engine — link to existing recovery only",
        },
    }


def _digest(raw: str) -> str:
    key = (get_settings().secret_key or "").encode("utf-8")
    return hmac.new(key, raw.encode("utf-8"), hashlib.sha256).hexdigest()


def _new_key(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def issue_session(
    db: Session,
    *,
    user: User,
    expires_minutes: int | None = None,
    kpi_excluded: bool = True,
    label: str = "session",
    assurance_level: str = "AAL1_PRIMARY",
) -> dict[str, Any]:
    """Mint managed access + one-time refresh; or legacy access if mint flag off."""
    f = _flags()
    settings = get_settings()
    ttl = expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    if not f["mint"]:
        token = create_access_token_claims({"sub": user.email}, expires_minutes=ttl)
        return {
            "access_token": token,
            "refresh_token": None,
            "session_key": None,
            "managed": False,
            "token_type": "bearer",
            "assurance_level": assurance_level,
        }

    now = _utcnow()
    session_key = _new_key("sess")
    family_key = _new_key("fam")
    refresh_raw = secrets.token_urlsafe(48)
    sess = CandidateAuthSession(
        user_id=user.id,
        session_key=session_key,
        family_key=family_key,
        epoch=1,
        state=STATE_ACTIVE,
        label=label[:64],
        expires_at=now + timedelta(minutes=ttl),
        created_at=now,
        kpi_excluded=kpi_excluded,
        first_value_satisfied=False,
        assurance_level=(assurance_level or "AAL1_PRIMARY")[:32],
    )
    db.add(sess)
    db.flush()
    fam = CandidateRefreshTokenFamily(
        user_id=user.id,
        session_id=sess.id,
        family_key=family_key,
        generation=1,
        current_digest=_digest(refresh_raw),
        previous_digest=None,
        state=STATE_ACTIVE,
        expires_at=now + timedelta(days=DEFAULT_REFRESH_TTL_DAYS),
        created_at=now,
        kpi_excluded=kpi_excluded,
    )
    db.add(fam)
    db.commit()
    access = create_access_token_claims(
        {
            "sub": user.email,
            MANAGED_CLAIM_SID: session_key,
            MANAGED_CLAIM_EPOCH: 1,
            MANAGED_CLAIM_TYP: ACCESS_TOKEN_TYP,
            "aal": assurance_level or "AAL1_PRIMARY",
        },
        expires_minutes=ttl,
    )
    return {
        "access_token": access,
        "refresh_token": refresh_raw,
        "session_key": session_key,
        "managed": True,
        "token_type": "bearer",
        "schema_id": SESSION_SCHEMA_ID,
        "assurance_level": assurance_level or "AAL1_PRIMARY",
    }


def validate_access_token(db: Session, token: str) -> tuple[str | None, str | None]:
    """Return (email, reject_reason). reject_reason None means accept."""
    claims = decode_access_token_claims(token)
    if not claims:
        return None, "invalid"
    sub = claims.get("sub")
    if not sub or not isinstance(sub, str):
        return None, "invalid"
    if sub.startswith("__") or ":oauth_state:" in sub or sub.startswith("cal_state:"):
        return sub, None

    f = _flags()
    sid = claims.get(MANAGED_CLAIM_SID)
    if not sid:
        if f["legacy_accept"] or not f["enforce"]:
            return sub, None
        return None, "legacy_rejected"

    if not f["verify"]:
        return sub, None

    row = (
        db.query(CandidateAuthSession)
        .filter(CandidateAuthSession.session_key == str(sid))
        .one_or_none()
    )
    if row is None:
        return None, "session_missing"
    if row.state != STATE_ACTIVE:
        return None, "session_revoked"
    if row.expires_at and row.expires_at < _utcnow():
        return None, "session_expired"
    epoch = int(claims.get(MANAGED_CLAIM_EPOCH) or 0)
    if epoch != int(row.epoch):
        return None, "epoch_mismatch"
    user = db.query(User).filter(User.email == sub).one_or_none()
    if user is None or user.id != row.user_id:
        return None, "user_mismatch"
    return sub, None


def _mark_family_reuse(db: Session, fam: CandidateRefreshTokenFamily) -> None:
    f = _flags()
    if not f["reuse_detection"]:
        return
    fam.state = STATE_REUSE_SUSPECTED
    fam.reuse_detected_at = _utcnow()
    fam.updated_at = _utcnow()
    sess = (
        db.query(CandidateAuthSession)
        .filter(CandidateAuthSession.id == fam.session_id)
        .one_or_none()
    )
    if sess and sess.state == STATE_ACTIVE:
        sess.state = STATE_REVOKED
        sess.revoked_at = _utcnow()
        sess.revoke_reason = "refresh_reuse"
        sess.epoch = int(sess.epoch) + 1
        sess.updated_at = _utcnow()
    db.commit()


def rotate_refresh(db: Session, *, refresh_token: str) -> dict[str, Any]:
    """Atomic one-time refresh (SELECT FOR UPDATE). Family-only reuse containment."""
    f = _flags()
    if not f["refresh_rotation"]:
        raise ValueError("refresh_disabled")
    digest = _digest(refresh_token)

    # Reuse of a rotated token → previous_digest match (family only)
    reused = (
        db.query(CandidateRefreshTokenFamily)
        .filter(CandidateRefreshTokenFamily.previous_digest == digest)
        .with_for_update()
        .one_or_none()
    )
    if reused is not None:
        _mark_family_reuse(db, reused)
        raise ValueError("family_reuse_suspected")

    fam = (
        db.query(CandidateRefreshTokenFamily)
        .filter(CandidateRefreshTokenFamily.current_digest == digest)
        .with_for_update()
        .one_or_none()
    )
    if fam is None:
        raise LookupError("invalid_refresh")
    if fam.state == STATE_REUSE_SUSPECTED:
        raise ValueError("family_reuse_suspected")
    if fam.state != STATE_ACTIVE:
        raise ValueError("family_revoked")
    if fam.expires_at < _utcnow():
        raise ValueError("refresh_expired")

    sess = (
        db.query(CandidateAuthSession)
        .filter(CandidateAuthSession.id == fam.session_id)
        .with_for_update()
        .one_or_none()
    )
    if sess is None or sess.state != STATE_ACTIVE:
        raise ValueError("session_revoked")

    new_raw = secrets.token_urlsafe(48)
    fam.previous_digest = fam.current_digest
    fam.generation = int(fam.generation) + 1
    fam.current_digest = _digest(new_raw)
    fam.rotated_at = _utcnow()
    fam.updated_at = _utcnow()

    user = db.query(User).filter(User.id == sess.user_id).one()
    settings = get_settings()
    access = create_access_token_claims(
        {
            "sub": user.email,
            MANAGED_CLAIM_SID: sess.session_key,
            MANAGED_CLAIM_EPOCH: sess.epoch,
            MANAGED_CLAIM_TYP: ACCESS_TOKEN_TYP,
        },
        expires_minutes=settings.access_token_expire_minutes,
    )
    db.commit()
    return {
        "access_token": access,
        "refresh_token": new_raw,
        "session_key": sess.session_key,
        "managed": True,
        "token_type": "bearer",
        "generation": fam.generation,
    }


def revoke_session(
    db: Session,
    *,
    user_id: int,
    session_key: str,
    reason: str = "owner_revoke",
) -> dict[str, Any]:
    t0 = time.perf_counter()
    row = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user_id,
            CandidateAuthSession.session_key == session_key,
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("session_not_found")
    if row.state == STATE_ACTIVE:
        row.state = STATE_REVOKED
        row.revoked_at = _utcnow()
        row.revoke_reason = reason[:64]
        row.epoch = int(row.epoch) + 1
        row.updated_at = _utcnow()
        fam = (
            db.query(CandidateRefreshTokenFamily)
            .filter(CandidateRefreshTokenFamily.session_id == row.id)
            .one_or_none()
        )
        if fam and fam.state == STATE_ACTIVE:
            fam.state = STATE_REVOKED
            fam.updated_at = _utcnow()
        db.commit()
    ms = int((time.perf_counter() - t0) * 1000)
    return {
        "revoked": True,
        "session_key": session_key,
        "revocation_propagation_slo_ms": ms,
    }


def revoke_all_other(
    db: Session, *, user_id: int, keep_session_key: str
) -> dict[str, Any]:
    rows = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user_id,
            CandidateAuthSession.state == STATE_ACTIVE,
            CandidateAuthSession.session_key != keep_session_key,
        )
        .all()
    )
    keys = [r.session_key for r in rows]
    for key in keys:
        revoke_session(db, user_id=user_id, session_key=key, reason="revoke_others")
    return {"revoked_count": len(keys), "kept": keep_session_key}


def revoke_everywhere(db: Session, *, user_id: int) -> dict[str, Any]:
    rows = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user_id,
            CandidateAuthSession.state == STATE_ACTIVE,
        )
        .all()
    )
    keys = [r.session_key for r in rows]
    for key in keys:
        revoke_session(db, user_id=user_id, session_key=key, reason="sign_out_everywhere")
    return {"revoked_count": len(keys), "no_mass_forced_logout_flag": NO_MASS_FORCED_LOGOUT}


def list_sessions_for_inventory(
    db: Session, *, user: User, current_session_key: str | None
) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user.id,
            CandidateAuthSession.state == STATE_ACTIVE,
        )
        .order_by(CandidateAuthSession.created_at.desc())
        .all()
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        is_current = bool(current_session_key and row.session_key == current_session_key)
        out.append(
            {
                "session_key": row.session_key,
                "is_current": is_current,
                "state": row.state,
                "epoch": row.epoch,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "revision": f"sess:{row.session_key}:e{row.epoch}",
                "label": "Current session" if is_current else "Other session",
                "revocable": True,
            }
        )
    if not out:
        out.append(
            {
                "session_key": f"legacy:{user.id}",
                "is_current": True,
                "state": STATE_ACTIVE,
                "epoch": 0,
                "expires_at": None,
                "revision": f"user:{user.id}:auth:legacy",
                "label": "Current signed-in session (legacy JWT)",
                "revocable": False,
            }
        )
    return out


def session_key_from_token(token: str) -> str | None:
    claims = decode_access_token_claims(token)
    if not claims:
        return None
    sid = claims.get(MANAGED_CLAIM_SID)
    return str(sid) if sid else None
