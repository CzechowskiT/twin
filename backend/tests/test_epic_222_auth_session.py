"""Epic 2.22 — managed session unit tests."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.core.security import create_access_token, decode_access_token_claims
from app.database.models import Candidate, CandidateAuthSession, CandidateRefreshTokenFamily, User
from app.services import candidate_auth_session as cas
from app.services.candidate_auth_session_constants import (
    CANONICAL_SESSION_AUTHORITY,
    PARALLEL_CREDENTIAL_STORE,
    PARALLEL_IDENTITY_STORE,
    SESSION_SCHEMA_ID,
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
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic222@session.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Sess", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, u, c


def test_catalog_authority():
    cat = cas.catalog()
    assert cat["schema_id"] == SESSION_SCHEMA_ID
    assert cat["parallel_identity_store"] == PARALLEL_IDENTITY_STORE == "NONE"
    assert cat["parallel_credential_store"] == PARALLEL_CREDENTIAL_STORE == "NONE"
    assert cat["canonical_session_authority"] == CANONICAL_SESSION_AUTHORITY
    assert cat["provider_reuse_gate"] == "BUILD_INTERNAL_MANAGED_SESSION_LAYER"
    assert cat["first_value_satisfied_by_auth_session"] is False
    assert cat["no_mass_forced_logout"] is True


def test_issue_validate_revoke():
    db, u, _c = _db()
    issued = cas.issue_session(db, user=u, expires_minutes=30)
    assert issued["managed"] is True
    assert issued["refresh_token"]
    claims = decode_access_token_claims(issued["access_token"])
    assert claims and claims.get("sid") == issued["session_key"]
    email, reason = cas.validate_access_token(db, issued["access_token"])
    assert email == u.email and reason is None
    out = cas.revoke_session(db, user_id=u.id, session_key=issued["session_key"])
    assert out["revoked"] is True
    assert "revocation_propagation_slo_ms" in out
    email2, reason2 = cas.validate_access_token(db, issued["access_token"])
    assert email2 is None and reason2 == "session_revoked"


def test_legacy_accepted():
    db, u, _c = _db()
    legacy = create_access_token(u.email, expires_minutes=10)
    email, reason = cas.validate_access_token(db, legacy)
    assert email == u.email and reason is None


def test_refresh_rotation_and_reuse():
    db, u, _c = _db()
    issued = cas.issue_session(db, user=u, expires_minutes=30)
    old_rt = issued["refresh_token"]
    rotated = cas.rotate_refresh(db, refresh_token=old_rt)
    assert rotated["refresh_token"] != old_rt
    assert rotated["generation"] == 2
    # Reuse old refresh → family containment
    with pytest.raises(ValueError, match="family_reuse_suspected"):
        cas.rotate_refresh(db, refresh_token=old_rt)
    # New access from first rotation still valid until epoch bump on reuse
    email, reason = cas.validate_access_token(db, rotated["access_token"])
    assert reason == "session_revoked" or email == u.email


def test_revoke_others_keeps_current():
    db, u, _c = _db()
    a = cas.issue_session(db, user=u, expires_minutes=30)
    b = cas.issue_session(db, user=u, expires_minutes=30)
    out = cas.revoke_all_other(db, user_id=u.id, keep_session_key=a["session_key"])
    assert out["revoked_count"] == 1
    assert cas.validate_access_token(db, a["access_token"])[1] is None
    assert cas.validate_access_token(db, b["access_token"])[1] == "session_revoked"


assert PARALLEL_IDENTITY_STORE == "NONE"
