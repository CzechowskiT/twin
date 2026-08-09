"""Epic 2.20 — Access Control Center unit tests (derived inventory)."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.database.models import (
    Candidate,
    CandidateCareerPack,
    CandidateCareerPackShareGrant,
    CandidateLifecyclePrivacy,
    User,
)
from app.services import candidate_access_inventory as cai
from app.services import candidate_career_pack_share as cps
from app.services.candidate_access_inventory_constants import (
    NEW_ACCESS_GRANT_STORE,
    SCHEMA_ID,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateCareerPack.__table__,
        CandidateCareerPackShareGrant.__table__,
        CandidateLifecyclePrivacy.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic220@access.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Acc", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, u, c


def test_catalog_no_parallel_store():
    cat = cai.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["new_access_grant_store"] == "NONE"
    assert cat["parallel_share_store"] == "NONE"
    assert cat["first_value_satisfied_by_access_center"] is False
    assert cat["secrets_in_inventory"] is False


def test_inventory_auth_and_share_revoke():
    db, u, c = _db()
    pack = CandidateCareerPack(
        candidate_id=c.id,
        pack_key="pk_acc20",
        pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK",
        state="READY",
        schema_version="twin.candidate_career_pack/v1",
        title="t",
        artifact_refs_json="[]",
        disclosure_json="{}",
        preview_json="{}",
        snapshot_hash="snap220snap220snap220snap220snap220snap220aa",
        immutable=True,
        pdf_bytes=b"%PDF-1.4",
        zip_bytes=None,
        byte_size=8,
        expires_at=datetime.utcnow() + timedelta(hours=48),
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=datetime.utcnow(),
    )
    db.add(pack)
    db.commit()
    db.refresh(pack)

    grant = CandidateCareerPackShareGrant(
        candidate_id=c.id,
        pack_id=pack.id,
        grant_key="gk_acc20",
        public_id="pub_acc20xxxxxx",
        secret_digest=cps._digest("secret-value-for-test-only-xx"),
        permission="INLINE_VIEW",
        state="ACTIVE",
        pack_snapshot_hash=pack.snapshot_hash,
        disclosure_hash=pack.snapshot_hash,
        expires_at=datetime.utcnow() + timedelta(hours=24),
        created_at=datetime.utcnow(),
    )
    db.add(grant)
    db.commit()

    inv = cai.build_inventory(db, user=u, candidate_id=c.id)
    assert inv["schema_id"] == SCHEMA_ID
    assert inv["new_access_grant_store"] == NEW_ACCESS_GRANT_STORE
    assert inv["derived_only"] is True
    kinds = {i["kind"] for i in inv["items"]}
    assert "AUTH_SESSION" in kinds
    assert "CAREER_PACK_SHARE" in kinds
    assert "TEMPORARY_CAREER_PACK_ARTIFACT" in kinds
    for i in inv["items"]:
        assert i.get("secret_present") is False
        assert i.get("bearer_url_present") is False
        assert i.get("recipient_activity") is None

    share = next(i for i in inv["items"] if i["kind"] == "CAREER_PACK_SHARE")
    out = cai.revoke_access(
        db,
        user=u,
        candidate_id=c.id,
        access_key=share["access_key"],
        kind="CAREER_PACK_SHARE",
        client_revision=share["revision"],
        confirm=True,
    )
    assert out["revoked"] is True
    assert out["post_condition_verified"] is True
    assert out["success_on_accept"] is False

    inv2 = cai.build_inventory(db, user=u, candidate_id=c.id)
    assert not any(
        i["kind"] == "CAREER_PACK_SHARE" and i["state"] == "ACTIVE" for i in inv2["items"]
    )


def test_auth_session_not_server_revocable():
    db, u, c = _db()
    inv = cai.build_inventory(db, user=u, candidate_id=c.id)
    auth = next(i for i in inv["items"] if i["kind"] == "AUTH_SESSION")
    with pytest.raises(ValueError, match="not_revocable"):
        cai.revoke_access(
            db,
            user=u,
            candidate_id=c.id,
            access_key=auth["access_key"],
            kind="AUTH_SESSION",
            client_revision=auth["revision"],
            confirm=True,
        )
