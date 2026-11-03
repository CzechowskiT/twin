"""Epic 2.23 — recovery + step-up unit tests."""

from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.core.security import hash_password, verify_password
from app.database.models import (
    Candidate,
    CandidateAuthSession,
    CandidateRecoverySecurityReceipt,
    CandidateRefreshTokenFamily,
    CandidateStepUpChallenge,
    PasswordResetToken,
    User,
)
from app.services import candidate_auth_session as cas
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import (
    MFA_PASSKEYS,
    PARALLEL_PASSWORD_RESET_STORE,
    PURPOSE_SIGN_OUT_EVERYWHERE,
    RECOVERY_SCHEMA_ID,
    STEP_UP_SCHEMA_ID,
)
from app.services.password_reset import (
    FORGOT_PASSWORD_ACK,
    complete_recovery_with_token,
    hash_reset_token,
    mint_synthetic_recovery_challenge,
    request_password_reset,
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
        PasswordResetToken.__table__,
        CandidateStepUpChallenge.__table__,
        CandidateRecoverySecurityReceipt.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic223@recovery.test",
        hashed_password=hash_password("OldPass123!"),
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Rec", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    db.refresh(u)
    return db, u


def test_catalogs_and_constants() -> None:
    from app.services.password_reset import catalog as recovery_catalog

    rc = recovery_catalog()
    assert rc["schema_id"] == RECOVERY_SCHEMA_ID
    assert rc["parallel_password_reset_store"] == "NONE"
    assert rc["mfa_passkeys"] == MFA_PASSKEYS
    assert rc["no_auto_mint_from_recovery"] is True
    sc = step_up.catalog()
    assert sc["schema_id"] == STEP_UP_SCHEMA_ID
    assert PURPOSE_SIGN_OUT_EVERYWHERE in sc["purposes"]
    assert sc["ttl_seconds"] <= 300
    assert PARALLEL_PASSWORD_RESET_STORE == "NONE"


def test_enumeration_ack_unknown_email() -> None:
    db, _ = _db()
    settings = MagicMock()
    settings.password_reset_token_ttl_minutes = 60
    settings.frontend_url = "http://localhost:3000"
    settings.environment = "test"
    settings.debug = False
    msg = request_password_reset(db, settings, "nobody-epic223@example.com")
    assert msg == FORGOT_PASSWORD_ACK


def test_synthetic_recovery_atomic_revoke_no_auto_mint() -> None:
    db, user = _db()
    issued = cas.issue_session(db, user=user, expires_minutes=30)
    assert issued.get("access_token")
    mint = mint_synthetic_recovery_challenge(db, user=user)
    raw = mint["token_once"]
    assert mint["mail_sent"] is False
    out = complete_recovery_with_token(db, raw, "NewPass123!")
    assert out is not None
    assert out["completed"] is True
    assert out["auto_mint_session"] is False
    assert out["require_fresh_login"] is True
    db.refresh(user)
    assert verify_password("NewPass123!", user.hashed_password)
    # challenge single-use
    assert complete_recovery_with_token(db, raw, "AnotherPass9!") is None
    # sessions revoked
    active = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user.id,
            CandidateAuthSession.state == "ACTIVE",
        )
        .count()
    )
    assert active == 0


def test_step_up_purpose_bound_and_single_use() -> None:
    db, user = _db()
    issued = cas.issue_session(db, user=user, expires_minutes=30)
    sid = issued["session_key"]
    claims = __import__(
        "app.core.security", fromlist=["decode_access_token_claims"]
    ).decode_access_token_claims(issued["access_token"])
    epoch = int(claims.get("epoch") or 0)
    once = step_up.issue_step_up(
        db,
        user=user,
        purpose=PURPOSE_SIGN_OUT_EVERYWHERE,
        password="OldPass123!",
        session_key=sid,
        session_epoch=epoch,
    )
    tok = once["step_up_token_once"]
    step_up.consume_step_up(
        db,
        user=user,
        purpose=PURPOSE_SIGN_OUT_EVERYWHERE,
        step_up_token=tok,
        session_key=sid,
        session_epoch=epoch,
    )
    with pytest.raises(ValueError, match="step_up"):
        step_up.consume_step_up(
            db,
            user=user,
            purpose=PURPOSE_SIGN_OUT_EVERYWHERE,
            step_up_token=tok,
            session_key=sid,
            session_epoch=epoch,
        )


def test_step_up_wrong_purpose_rejected() -> None:
    db, user = _db()
    once = step_up.issue_step_up(
        db,
        user=user,
        purpose=PURPOSE_SIGN_OUT_EVERYWHERE,
        password="OldPass123!",
        session_key=None,
        session_epoch=None,
    )
    with pytest.raises(ValueError, match="purpose"):
        step_up.consume_step_up(
            db,
            user=user,
            purpose="CHANGE_PASSWORD",
            step_up_token=once["step_up_token_once"],
            session_key=None,
            session_epoch=None,
        )


def test_hash_reset_stable() -> None:
    assert len(hash_reset_token("abc")) == 64
    assert hash_reset_token("abc") == hash_reset_token("abc")
