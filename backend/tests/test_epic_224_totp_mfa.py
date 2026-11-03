"""Epic 2.24 — TOTP MFA unit tests (synthetic; no secrets printed)."""

from __future__ import annotations

from datetime import datetime

import pyotp
import pytest

from app.core.security import hash_password
from app.database.models import (
    Candidate,
    CandidateAuthSession,
    CandidateMfaChallenge,
    CandidateMfaFactor,
    CandidateMfaRecoveryCode,
    CandidateRefreshTokenFamily,
    User,
)
from app.services import candidate_auth_session as cas
from app.services import candidate_mfa as mfa
from app.services.candidate_mfa_constants import (
    ASSURANCE_AAL2_TOTP,
    MFA_DEFAULT,
    MANDATORY_MFA,
    PASSKEYS_WEBAUTHN,
    STATE_ENABLED,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateAuthSession.__table__,
        CandidateRefreshTokenFamily.__table__,
        CandidateMfaFactor.__table__,
        CandidateMfaChallenge.__table__,
        CandidateMfaRecoveryCode.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic224@mfa.test",
        hashed_password=hash_password("MfaPass123!"),
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    db.add(Candidate(user_id=u.id, name="MFA Synth", skills="[]", experience_years=1))
    db.commit()
    db.refresh(u)
    return db, u


def test_catalog_stance() -> None:
    cat = mfa.catalog()
    assert cat["mfa_default"] == MFA_DEFAULT == "OFF"
    assert cat["mandatory_mfa"] == MANDATORY_MFA == "OFF"
    assert cat["passkeys_webauthn"] == PASSKEYS_WEBAUTHN
    assert cat["sms_otp"] is False
    assert cat["email_otp"] is False
    assert cat["first_value_satisfied_by_mfa"] is False
    assert cat["totp_library"] == "pyotp"
    assert cat["keyring"]["uses_secret_key"] is False


def test_enroll_verify_replay_and_recovery_login() -> None:
    db, user = _db()
    started = mfa.enroll_start(db, user=user)
    secret = started["secret_once"]
    assert started["state"] == "PENDING_FACTOR"
    code = pyotp.TOTP(secret).now()
    verified = mfa.enroll_verify(db, user=user, code=code)
    assert verified["state"] == "FACTOR_VERIFIED"
    codes = mfa.enroll_present_recovery_codes(db, user=user)
    assert codes["state"] == STATE_ENABLED
    assert len(codes["recovery_codes_once"]) == 10
    assert mfa.user_mfa_enabled(db, user_id=user.id)

    # Replay same TOTP counter rejected
    ch = mfa.issue_login_challenge(db, user=user)
    with pytest.raises(ValueError, match="totp_replay|invalid_totp"):
        mfa.complete_login_challenge(
            db,
            challenge_token=ch["mfa_challenge_token"],
            totp_code=code,
        )

    # Fresh code path — wait for next window or use recovery code
    ch2 = mfa.issue_login_challenge(db, user=user)
    rc = codes["recovery_codes_once"][0]
    issued = mfa.complete_login_challenge(
        db,
        challenge_token=ch2["mfa_challenge_token"],
        recovery_code=rc,
    )
    assert issued.get("access_token")
    assert issued.get("assurance_level") == "AAL2_RECOVERY_CODE"

    # Same recovery code cannot be reused
    ch3 = mfa.issue_login_challenge(db, user=user)
    with pytest.raises(ValueError, match="invalid_recovery_code"):
        mfa.complete_login_challenge(
            db,
            challenge_token=ch3["mfa_challenge_token"],
            recovery_code=rc,
        )


def test_disable_and_default_off() -> None:
    db, user = _db()
    started = mfa.enroll_start(db, user=user)
    mfa.enroll_verify(db, user=user, code=pyotp.TOTP(started["secret_once"]).now())
    mfa.enroll_present_recovery_codes(db, user=user)
    mfa.disable_mfa(db, user=user)
    assert not mfa.user_mfa_enabled(db, user_id=user.id)
    st = mfa.status_for_user(db, user=user)
    assert st["enabled"] is False


def test_anti_lockout_reset() -> None:
    db, user = _db()
    started = mfa.enroll_start(db, user=user)
    mfa.enroll_verify(db, user=user, code=pyotp.TOTP(started["secret_once"]).now())
    mfa.enroll_present_recovery_codes(db, user=user)
    mfa.reset_after_account_recovery(db, user_id=user.id)
    db.commit()
    assert not mfa.user_mfa_enabled(db, user_id=user.id)
