"""Pilot Gate P1 — invite token lifecycle proofs (no real send)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from app.database.models import (
    CandidateInviteToken,
    CandidatePilotAllowlist,
    CandidatePilotCohort,
    CandidatePilotIntakeRow,
    CandidatePilotInvitationPack,
)
from app.services import candidate_invite_tokens as invite_tokens
from tests.test_auth_integration import _sqlite_session


def _db_with_tables():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        CandidatePilotCohort.__table__,
        CandidatePilotInvitationPack.__table__,
        CandidatePilotIntakeRow.__table__,
        CandidateInviteToken.__table__,
        CandidatePilotAllowlist.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    return db


def _cohort(db) -> int:
    c = CandidatePilotCohort(
        slug=f"gate-p1-lifecycle-{secrets.token_hex(4)}",
        display_name="Gate P1 Lifecycle",
        status="FOUNDER_APPROVED",
        created_at=datetime.utcnow(),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return int(c.id)


def test_token_entropy_at_least_128_bits() -> None:
    raw = secrets.token_urlsafe(32)
    assert len(raw) >= 32
    digest = invite_tokens.hash_token(raw)
    assert digest != raw
    assert len(digest) == 64


def test_validate_get_does_not_consume_and_single_use() -> None:
    db = _db_with_tables()
    try:
        cid = _cohort(db)
        email = "canary.gate@example.com"
        raw = "GateP1NonConsumeTokenUrlSafe32AAAAAA"
        now = datetime.utcnow()
        db.add(
            CandidateInviteToken(
                cohort_id=cid,
                email_hash=invite_tokens.hash_email(email),
                email_masked=invite_tokens.mask_email(email),
                token_hash=invite_tokens.hash_token(raw),
                status=invite_tokens.TOKEN_STATUS_ACTIVE,
                expires_at=now + timedelta(days=7),
                created_at=now,
                validate_fail_count=0,
            )
        )
        db.commit()

        ok, reason = invite_tokens.validate_invite_token(
            db, email=email, raw_token=raw, consume=False
        )
        assert ok and reason == "ok"
        refreshed = db.query(CandidateInviteToken).one()
        assert refreshed.status == invite_tokens.TOKEN_STATUS_ACTIVE
        assert refreshed.used_at is None

        ok2, _ = invite_tokens.validate_invite_token(
            db, email=email, raw_token=raw, consume=True
        )
        assert ok2
        used = db.query(CandidateInviteToken).one()
        assert used.status == invite_tokens.TOKEN_STATUS_USED
        assert used.used_at is not None

        ok3, reason3 = invite_tokens.validate_invite_token(
            db, email=email, raw_token=raw, consume=False
        )
        assert not ok3 and reason3 == "invite_token_used"
    finally:
        db.close()


def test_expiry_and_revocation() -> None:
    db = _db_with_tables()
    try:
        cid = _cohort(db)
        email = "expire.gate@example.com"
        raw = "GateP1ExpireTokenUrlSafe32BytesAAAAAAA"
        now = datetime.utcnow()
        db.add(
            CandidateInviteToken(
                cohort_id=cid,
                email_hash=invite_tokens.hash_email(email),
                email_masked=invite_tokens.mask_email(email),
                token_hash=invite_tokens.hash_token(raw),
                status=invite_tokens.TOKEN_STATUS_ACTIVE,
                expires_at=now - timedelta(minutes=1),
                created_at=now - timedelta(days=1),
                validate_fail_count=0,
            )
        )
        db.commit()
        ok, reason = invite_tokens.validate_invite_token(
            db, email=email, raw_token=raw, consume=False
        )
        assert not ok and reason == "invite_token_expired"

        raw2 = "GateP1RevokeTokenUrlSafe32BytesBBBBBBB"
        row2 = CandidateInviteToken(
            cohort_id=cid,
            email_hash=invite_tokens.hash_email(email),
            email_masked=invite_tokens.mask_email(email),
            token_hash=invite_tokens.hash_token(raw2),
            status=invite_tokens.TOKEN_STATUS_ACTIVE,
            expires_at=now + timedelta(days=3),
            created_at=now,
            validate_fail_count=0,
        )
        db.add(row2)
        db.commit()
        tid = row2.id
        invite_tokens.revoke_invite_token(db, token_id=tid)
        ok2, reason2 = invite_tokens.validate_invite_token(
            db, email=email, raw_token=raw2, consume=False
        )
        assert not ok2 and reason2 == "invite_token_revoked"
    finally:
        db.close()


def test_email_mismatch_isolation() -> None:
    db = _db_with_tables()
    try:
        cid = _cohort(db)
        raw = "GateP1IsoTokenUrlSafe32BytesCCCCCCCCC"
        now = datetime.utcnow()
        db.add(
            CandidateInviteToken(
                cohort_id=cid,
                email_hash=invite_tokens.hash_email("owner@example.com"),
                email_masked=invite_tokens.mask_email("owner@example.com"),
                token_hash=invite_tokens.hash_token(raw),
                status=invite_tokens.TOKEN_STATUS_ACTIVE,
                expires_at=now + timedelta(days=3),
                created_at=now,
                validate_fail_count=0,
            )
        )
        db.commit()
        ok, reason = invite_tokens.validate_invite_token(
            db, email="attacker@example.com", raw_token=raw, consume=False
        )
        assert not ok and reason == "invite_token_email_mismatch"
        row = db.query(CandidateInviteToken).one()
        assert row.status == invite_tokens.TOKEN_STATUS_ACTIVE
        assert int(row.validate_fail_count or 0) >= 1
    finally:
        db.close()
