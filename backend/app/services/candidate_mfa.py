"""Epic 2.24 — opt-in TOTP MFA + one-time recovery codes.

Uses pyotp (RFC 6238). Secrets via dedicated MFA AEAD keyring.
Successful MFA mints Epic 2.22 managed session with assurance claim.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import pyotp
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import (
    CandidateMfaChallenge,
    CandidateMfaFactor,
    CandidateMfaRecoveryCode,
    User,
)
from app.services import candidate_auth_session as cas
from app.services.candidate_mfa_constants import (
    ASSURANCE_AAL1,
    ASSURANCE_AAL2_RECOVERY,
    ASSURANCE_AAL2_TOTP,
    CANONICAL_SESSION_AUTHORITY,
    CHALLENGE_KIND_LOGIN,
    CHALLENGE_SCHEMA_ID,
    CHALLENGE_TTL_SECONDS,
    CONTRACT_ID,
    ENROLLMENT_SCHEMA_ID,
    FACTOR_SCHEMA_ID,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_MFA,
    MFA_DEFAULT,
    MFA_ENROLLMENT,
    MANDATORY_MFA,
    METHOD_RECOVERY_CODE,
    METHOD_TOTP,
    PARALLEL_MFA_STORE,
    PARALLEL_SESSION_STORE,
    PASSKEYS_WEBAUTHN,
    PROVIDER_REUSE_GATE,
    RECOVERY_CODE_COUNT,
    RECOVERY_CODE_LENGTH,
    RECOVERY_CODE_SET_SCHEMA_ID,
    SESSION_ASSURANCE_SCHEMA_ID,
    STATE_DISABLED,
    STATE_ENABLED,
    STATE_FACTOR_VERIFIED,
    STATE_PENDING_FACTOR,
    STATE_RECOVERY_CODES_PRESENTED,
    STATE_REVOKED,
    TOTP_DIGITS,
    TOTP_INTERVAL,
    TOTP_LIBRARY,
    TOTP_SECRET_BITS,
    TOTP_VALID_WINDOW,
)
from app.services.candidate_mfa_crypto import (
    MfaKeyringUnavailable,
    catalog_keyring,
    decrypt_totp_secret,
    encrypt_totp_secret,
    keyring_available,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _digest(raw: str) -> str:
    key = (get_settings().secret_key or "").encode("utf-8")
    return hmac.new(key, raw.encode("utf-8"), hashlib.sha256).hexdigest()


def _flags() -> dict[str, bool]:
    s = get_settings()
    return {
        "totp_feature": bool(getattr(s, "auth_mfa_totp_enabled", True)),
        "default_off": bool(getattr(s, "auth_mfa_default_off", True)),
        "opt_in_only": bool(getattr(s, "auth_mfa_enrollment_opt_in_only", True)),
        "mandatory": bool(getattr(s, "auth_mfa_mandatory", False)),
    }


def catalog() -> dict[str, Any]:
    f = _flags()
    return {
        "schema_id": FACTOR_SCHEMA_ID,
        "enrollment_schema_id": ENROLLMENT_SCHEMA_ID,
        "challenge_schema_id": CHALLENGE_SCHEMA_ID,
        "recovery_code_set_schema_id": RECOVERY_CODE_SET_SCHEMA_ID,
        "session_assurance_schema_id": SESSION_ASSURANCE_SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "mfa_default": MFA_DEFAULT,
        "mfa_enrollment": MFA_ENROLLMENT,
        "mandatory_mfa": MANDATORY_MFA,
        "passkeys_webauthn": PASSKEYS_WEBAUTHN,
        "parallel_mfa_store": PARALLEL_MFA_STORE,
        "parallel_session_store": PARALLEL_SESSION_STORE,
        "canonical_session_authority": CANONICAL_SESSION_AUTHORITY,
        "provider_reuse_gate": PROVIDER_REUSE_GATE,
        "totp_library": TOTP_LIBRARY,
        "first_value_satisfied_by_mfa": FIRST_VALUE_SATISFIED_BY_MFA,
        "sms_otp": False,
        "email_otp": False,
        "trusted_devices": False,
        "fingerprinting": False,
        "behavioral_scoring": False,
        "flags": f,
        "keyring": catalog_keyring(),
        "totp": {
            "digits": TOTP_DIGITS,
            "interval": TOTP_INTERVAL,
            "window": TOTP_VALID_WINDOW,
            "secret_bits": TOTP_SECRET_BITS,
        },
        "challenge_ttl_seconds": CHALLENGE_TTL_SECONDS,
    }


def user_mfa_enabled(db: Session, *, user_id: int) -> bool:
    row = (
        db.query(CandidateMfaFactor)
        .filter(
            CandidateMfaFactor.user_id == user_id,
            CandidateMfaFactor.state == STATE_ENABLED,
            CandidateMfaFactor.factor_type == "totp",
        )
        .one_or_none()
    )
    return row is not None


def status_for_user(db: Session, *, user: User) -> dict[str, Any]:
    factor = (
        db.query(CandidateMfaFactor)
        .filter(CandidateMfaFactor.user_id == user.id, CandidateMfaFactor.factor_type == "totp")
        .order_by(CandidateMfaFactor.id.desc())
        .first()
    )
    active_codes = (
        db.query(CandidateMfaRecoveryCode)
        .filter(
            CandidateMfaRecoveryCode.user_id == user.id,
            CandidateMfaRecoveryCode.state == "ACTIVE",
        )
        .count()
    )
    state = factor.state if factor else STATE_DISABLED
    return {
        "schema_id": FACTOR_SCHEMA_ID,
        "state": state,
        "enabled": state == STATE_ENABLED,
        "factor_key": factor.factor_key if factor else None,
        "recovery_codes_remaining": active_codes,
        "first_value_satisfied": False,
        "mandatory": False,
        "opt_in_only": True,
    }


def _require_feature() -> None:
    if not _flags()["totp_feature"]:
        raise ValueError("mfa_feature_disabled")
    if _flags()["mandatory"]:
        raise ValueError("mandatory_mfa_forbidden")


def _require_keyring() -> None:
    if not keyring_available():
        raise MfaKeyringUnavailable("mfa_aead_key_unavailable")


def _recovery_channel_ok(user: User) -> bool:
    """Verified recovery channel: password login capable (Epic 2.23 reset path)."""
    return bool(user.hashed_password and user.is_active)


def enroll_start(db: Session, *, user: User) -> dict[str, Any]:
    """DISABLED → PENDING_FACTOR. Returns secret once (+ otpauth URI)."""
    _require_feature()
    _require_keyring()
    if not _recovery_channel_ok(user):
        raise ValueError("recovery_channel_required")
    if user_mfa_enabled(db, user_id=user.id):
        raise ValueError("mfa_already_enabled")

    # Cancel prior pending
    db.query(CandidateMfaFactor).filter(
        CandidateMfaFactor.user_id == user.id,
        CandidateMfaFactor.state.in_(
            [STATE_PENDING_FACTOR, STATE_FACTOR_VERIFIED, STATE_RECOVERY_CODES_PRESENTED]
        ),
    ).update(
        {"state": STATE_REVOKED, "disabled_at": _utcnow()},
        synchronize_session=False,
    )

    secret = pyotp.random_base32(length=max(32, TOTP_SECRET_BITS // 5))
    now = _utcnow()
    factor = CandidateMfaFactor(
        user_id=user.id,
        factor_key=f"mfa_{uuid.uuid4().hex}",
        factor_type="totp",
        state=STATE_PENDING_FACTOR,
        secret_ciphertext=encrypt_totp_secret(secret),
        secret_key_version=1,
        issuer_label="TWIN",
        account_label=(user.email or "")[:255],
        schema_version=FACTOR_SCHEMA_ID,
        created_at=now,
        kpi_excluded=bool(getattr(user, "exclude_from_product_metrics", False)),
    )
    db.add(factor)
    db.commit()
    totp = pyotp.TOTP(secret, digits=TOTP_DIGITS, interval=TOTP_INTERVAL)
    uri = totp.provisioning_uri(name=user.email or factor.factor_key, issuer_name="TWIN")
    return {
        "schema_id": ENROLLMENT_SCHEMA_ID,
        "state": STATE_PENDING_FACTOR,
        "factor_key": factor.factor_key,
        "secret_once": secret,
        "otpauth_uri_once": uri,
        "digits": TOTP_DIGITS,
        "interval": TOTP_INTERVAL,
        "first_value_satisfied": False,
    }


def enroll_verify(db: Session, *, user: User, code: str) -> dict[str, Any]:
    """PENDING_FACTOR → FACTOR_VERIFIED via TOTP."""
    _require_feature()
    _require_keyring()
    factor = (
        db.query(CandidateMfaFactor)
        .filter(
            CandidateMfaFactor.user_id == user.id,
            CandidateMfaFactor.state == STATE_PENDING_FACTOR,
        )
        .with_for_update()
        .one_or_none()
    )
    if factor is None or not factor.secret_ciphertext:
        raise ValueError("no_pending_factor")
    secret = decrypt_totp_secret(factor.secret_ciphertext)
    totp = pyotp.TOTP(secret, digits=TOTP_DIGITS, interval=TOTP_INTERVAL)
    if not totp.verify(code.strip(), valid_window=TOTP_VALID_WINDOW):
        raise ValueError("invalid_totp")
    counter = int(_utcnow().timestamp()) // TOTP_INTERVAL
    factor.last_accepted_counter = counter
    factor.state = STATE_FACTOR_VERIFIED
    factor.verified_at = _utcnow()
    db.commit()
    return {
        "schema_id": ENROLLMENT_SCHEMA_ID,
        "state": STATE_FACTOR_VERIFIED,
        "factor_key": factor.factor_key,
        "next": "present_recovery_codes",
        "first_value_satisfied": False,
    }


def enroll_present_recovery_codes(db: Session, *, user: User) -> dict[str, Any]:
    """FACTOR_VERIFIED → RECOVERY_CODES_PRESENTED → ENABLED. Codes shown once."""
    _require_feature()
    factor = (
        db.query(CandidateMfaFactor)
        .filter(
            CandidateMfaFactor.user_id == user.id,
            CandidateMfaFactor.state == STATE_FACTOR_VERIFIED,
        )
        .with_for_update()
        .one_or_none()
    )
    if factor is None:
        raise ValueError("factor_not_verified")

    db.query(CandidateMfaRecoveryCode).filter(
        CandidateMfaRecoveryCode.user_id == user.id,
        CandidateMfaRecoveryCode.state == "ACTIVE",
    ).update({"state": "REVOKED"}, synchronize_session=False)

    set_key = f"mset_{uuid.uuid4().hex}"
    plain_codes: list[str] = []
    now = _utcnow()
    for _ in range(RECOVERY_CODE_COUNT):
        raw = secrets.token_hex(RECOVERY_CODE_LENGTH // 2)
        plain_codes.append(raw)
        db.add(
            CandidateMfaRecoveryCode(
                user_id=user.id,
                set_key=set_key,
                code_digest=_digest(raw),
                state="ACTIVE",
                schema_version=RECOVERY_CODE_SET_SCHEMA_ID,
                created_at=now,
                kpi_excluded=True,
            )
        )
    factor.state = STATE_ENABLED
    factor.enabled_at = now
    db.commit()
    return {
        "schema_id": RECOVERY_CODE_SET_SCHEMA_ID,
        "state": STATE_ENABLED,
        "set_key": set_key,
        "recovery_codes_once": plain_codes,
        "count": len(plain_codes),
        "first_value_satisfied": False,
        "shown_once": True,
    }


def disable_mfa(db: Session, *, user: User) -> dict[str, Any]:
    """Safe disable — revoke factor + unused codes."""
    _require_feature()
    now = _utcnow()
    db.query(CandidateMfaFactor).filter(
        CandidateMfaFactor.user_id == user.id,
        CandidateMfaFactor.state == STATE_ENABLED,
    ).update(
        {"state": STATE_DISABLED, "disabled_at": now},
        synchronize_session=False,
    )
    db.query(CandidateMfaRecoveryCode).filter(
        CandidateMfaRecoveryCode.user_id == user.id,
        CandidateMfaRecoveryCode.state == "ACTIVE",
    ).update({"state": "REVOKED"}, synchronize_session=False)
    db.query(CandidateMfaChallenge).filter(
        CandidateMfaChallenge.user_id == user.id,
        CandidateMfaChallenge.state == "ACTIVE",
    ).update({"state": "CANCELLED"}, synchronize_session=False)
    db.commit()
    return {"disabled": True, "schema_id": FACTOR_SCHEMA_ID, "first_value_satisfied": False}


def reset_after_account_recovery(db: Session, *, user_id: int) -> None:
    """Anti-lockout: password recovery clears MFA (MFA_RECOVERY_RESET)."""
    now = _utcnow()
    db.query(CandidateMfaFactor).filter(CandidateMfaFactor.user_id == user_id).update(
        {"state": STATE_DISABLED, "disabled_at": now},
        synchronize_session=False,
    )
    db.query(CandidateMfaRecoveryCode).filter(
        CandidateMfaRecoveryCode.user_id == user_id,
        CandidateMfaRecoveryCode.state == "ACTIVE",
    ).update({"state": "REVOKED"}, synchronize_session=False)
    db.query(CandidateMfaChallenge).filter(
        CandidateMfaChallenge.user_id == user_id,
        CandidateMfaChallenge.state == "ACTIVE",
    ).update({"state": "CANCELLED"}, synchronize_session=False)
    # Caller commits with recovery transaction


def issue_login_challenge(db: Session, *, user: User) -> dict[str, Any]:
    """After password OK — restricted pre-auth challenge (no candidate API access)."""
    _require_feature()
    if not user_mfa_enabled(db, user_id=user.id):
        raise ValueError("mfa_not_enabled")
    raw = secrets.token_urlsafe(32)
    now = _utcnow()
    row = CandidateMfaChallenge(
        user_id=user.id,
        challenge_key=f"mch_{uuid.uuid4().hex}",
        token_digest=_digest(raw),
        kind=CHALLENGE_KIND_LOGIN,
        state="ACTIVE",
        schema_version=CHALLENGE_SCHEMA_ID,
        expires_at=now + timedelta(seconds=CHALLENGE_TTL_SECONDS),
        created_at=now,
        kpi_excluded=bool(getattr(user, "exclude_from_product_metrics", False)),
    )
    db.add(row)
    db.commit()
    return {
        "schema_id": CHALLENGE_SCHEMA_ID,
        "mfa_required": True,
        "mfa_challenge_token": raw,
        "methods": [METHOD_TOTP, METHOD_RECOVERY_CODE],
        "expires_at": row.expires_at.isoformat(),
        "ttl_seconds": CHALLENGE_TTL_SECONDS,
        "access_token": None,
        "pre_auth_only": True,
        "first_value_satisfied": False,
    }


def _load_challenge(db: Session, raw_token: str) -> CandidateMfaChallenge:
    digest = _digest((raw_token or "").strip())
    row = (
        db.query(CandidateMfaChallenge)
        .filter(CandidateMfaChallenge.token_digest == digest)
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise ValueError("challenge_invalid")
    if row.state != "ACTIVE":
        raise ValueError("challenge_used")
    if row.expires_at < _utcnow():
        raise ValueError("challenge_expired")
    return row


def _accept_totp(db: Session, *, user: User, code: str) -> str:
    """Atomic counter update — exactly one acceptance per TOTP counter."""
    _require_keyring()
    factor = (
        db.query(CandidateMfaFactor)
        .filter(
            CandidateMfaFactor.user_id == user.id,
            CandidateMfaFactor.state == STATE_ENABLED,
        )
        .with_for_update()
        .one_or_none()
    )
    if factor is None or not factor.secret_ciphertext:
        raise ValueError("mfa_not_enabled")
    secret = decrypt_totp_secret(factor.secret_ciphertext)
    totp = pyotp.TOTP(secret, digits=TOTP_DIGITS, interval=TOTP_INTERVAL)
    code_clean = (code or "").strip().replace(" ", "")
    now_counter = int(_utcnow().timestamp()) // TOTP_INTERVAL
    matched_counter: int | None = None
    for offset in range(-TOTP_VALID_WINDOW, TOTP_VALID_WINDOW + 1):
        counter = now_counter + offset
        if hmac.compare_digest(str(totp.at(counter)), code_clean):
            matched_counter = counter
            break
    if matched_counter is None:
        raise ValueError("invalid_totp")
    if factor.last_accepted_counter is not None and matched_counter <= int(
        factor.last_accepted_counter
    ):
        raise ValueError("totp_replay")
    factor.last_accepted_counter = matched_counter
    return ASSURANCE_AAL2_TOTP


def _accept_recovery_code(db: Session, *, user: User, code: str) -> str:
    digest = _digest(code.strip().lower())
    # Also try raw as entered
    digests = {digest, _digest(code.strip())}
    row = (
        db.query(CandidateMfaRecoveryCode)
        .filter(
            CandidateMfaRecoveryCode.user_id == user.id,
            CandidateMfaRecoveryCode.code_digest.in_(digests),
            CandidateMfaRecoveryCode.state == "ACTIVE",
        )
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise ValueError("invalid_recovery_code")
    row.state = "USED"
    row.used_at = _utcnow()
    return ASSURANCE_AAL2_RECOVERY


def complete_login_challenge(
    db: Session,
    *,
    challenge_token: str,
    totp_code: str | None = None,
    recovery_code: str | None = None,
) -> dict[str, Any]:
    """Consume challenge → mint managed session with assurance."""
    _require_feature()
    ch = _load_challenge(db, challenge_token)
    user = db.get(User, ch.user_id)
    if user is None or not user.is_active:
        raise ValueError("challenge_invalid")
    if totp_code:
        assurance = _accept_totp(db, user=user, code=totp_code)
    elif recovery_code:
        assurance = _accept_recovery_code(db, user=user, code=recovery_code)
    else:
        raise ValueError("method_required")
    ch.state = "USED"
    ch.used_at = _utcnow()
    db.commit()

    issued = cas.issue_session(
        db,
        user=user,
        kpi_excluded=bool(getattr(user, "exclude_from_product_metrics", False)),
        label="mfa_session",
        assurance_level=assurance,
    )
    issued["assurance_level"] = assurance
    issued["mfa_required"] = False
    issued["schema_id_assurance"] = SESSION_ASSURANCE_SCHEMA_ID
    issued["first_value_satisfied"] = False
    return issued


def inventory_item(db: Session, *, user: User) -> dict[str, Any] | None:
    st = status_for_user(db, user=user)
    if st["state"] == STATE_DISABLED and not st["enabled"]:
        # Still show opt-in surface as AVAILABLE when feature on
        if not _flags()["totp_feature"]:
            return None
        return {
            "kind": "MFA_TOTP",
            "access_key": f"mfa_totp:{user.id}:off",
            "title": "Authenticator app (TOTP)",
            "scope": "Optional two-step sign-in — off by default",
            "state": "AVAILABLE",
            "revocable": False,
            "revision": f"mfa:off:{user.id}",
            "consequence": "Enroll from Access Center — never mandatory.",
            "source_ref": {"enabled": False, "opt_in_only": True},
        }
    return {
        "kind": "MFA_TOTP",
        "access_key": f"mfa_totp:{user.id}:{st.get('factor_key') or 'x'}",
        "title": "Authenticator app (TOTP)",
        "scope": f"State {st['state']}; recovery codes remaining {st['recovery_codes_remaining']}",
        "state": "ACTIVE" if st["enabled"] else st["state"],
        "revocable": bool(st["enabled"]),
        "revision": f"mfa:{st.get('factor_key')}:{st['state']}:{st['recovery_codes_remaining']}",
        "consequence": "Disable removes TOTP and unused recovery codes (requires step-up).",
        "expires_at": None,
        "source_ref": {
            "enabled": st["enabled"],
            "factor_key": st.get("factor_key"),
            "recovery_codes_remaining": st["recovery_codes_remaining"],
            "secret_present": False,
        },
    }
