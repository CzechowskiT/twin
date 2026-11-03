"""Epic 2.19 — Career Pack share grant unit tests (synthetic only)."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.database.models import (
    Candidate,
    CandidateCareerPack,
    CandidateCareerPackAudit,
    CandidateCareerPackShareGrant,
    CandidateLifecyclePrivacy,
    User,
)
from app.services import candidate_career_pack_share as cps
from app.services.candidate_career_pack_share_constants import (
    EIGHTH_PRIMARY_NAV,
    FIRST_VALUE_SATISFIED_BY_SHARE_GRANT,
    MAX_ACTIVE_GRANTS_PER_CANDIDATE,
    OUTBOUND_SEND,
    PARALLEL_CAREER_PACK_STORE,
    RECIPIENT_TRACKING,
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
        CandidateCareerPackAudit.__table__,
        CandidateCareerPackShareGrant.__table__,
        CandidateLifecyclePrivacy.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic219@share.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Share", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, c


def _ready_pack(db, c, key="pack_share219"):
    pack = CandidateCareerPack(
        candidate_id=c.id,
        pack_key=key,
        pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK",
        state="READY",
        schema_version="twin.candidate_career_pack/v1",
        title="Shareable",
        artifact_refs_json="[]",
        disclosure_json='{"display_name":true}',
        preview_json="{}",
        preview_hash="previewhash219previewhash219previewhash21",
        snapshot_json='{"payload":{"sections":[{"field":"display_name","value":"Synth"}],"disclosure":{"display_name":true}}}',
        snapshot_hash="snap219snap219snap219snap219snap219snap219aa",
        immutable=True,
        pdf_bytes=b"%PDF-1.4 synth",
        zip_bytes=b"PK\x03\x04synthzip",
        byte_size=20,
        expires_at=datetime.utcnow() + timedelta(hours=48),
        external_delivery=False,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=datetime.utcnow(),
    )
    db.add(pack)
    db.commit()
    return pack


def test_catalog_contracts():
    cat = cps.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["outbound_send"] is False
    assert cat["recipient_tracking"] is False
    assert cat["parallel_career_pack_store"] == "NONE"
    assert cat["first_value_satisfied_by_share_grant"] is False
    assert cat["eighth_primary_nav"] is False
    assert OUTBOUND_SEND is False
    assert RECIPIENT_TRACKING is False
    assert PARALLEL_CAREER_PACK_STORE == "NONE"
    assert FIRST_VALUE_SATISFIED_BY_SHARE_GRANT is False
    assert EIGHTH_PRIMARY_NAV is False
    assert cat["max_active_grants_per_candidate"] == MAX_ACTIVE_GRANTS_PER_CANDIDATE


def test_create_exchange_view_revoke():
    db, c = _db()
    pack = _ready_pack(db, c)
    out = cps.create_grant(
        db,
        candidate_id=c.id,
        pack_key=pack.pack_key,
        permission="INLINE_VIEW",
        ttl_hours=24,
        disclosure_hash=pack.snapshot_hash,
        confirm_disclosure=True,
        public_base_url="https://example.test",
    )
    assert out["created"] is True
    assert out["outbound_send"] is False
    assert out["first_value_satisfied"] is False
    assert "#key=" in out["share_url_once"]
    secret = out["share_url_once"].split("#key=")[1]
    public_id = out["public_id"]

    ok, token = cps.exchange_secret(db, public_id=public_id, secret=secret)
    assert ok is True and token
    view = cps.recipient_view(db, public_id=public_id, session_token=token)
    assert view["signup_cta"] is False
    assert view["recipient_tracking"] is False
    assert view["sections"]

    # wrong secret
    ok2, _ = cps.exchange_secret(db, public_id=public_id, secret="wrong-secret-value")
    assert ok2 is False

    revoked = cps.revoke_grant(
        db, candidate_id=c.id, pack_key=pack.pack_key, grant_key=out["grant_key"]
    )
    assert revoked["state"] == "REVOKED"
    ok3, _ = cps.exchange_secret(db, public_id=public_id, secret=secret)
    assert ok3 is False


def test_disclosure_hash_and_confirm_required():
    db, c = _db()
    pack = _ready_pack(db, c)
    try:
        cps.create_grant(
            db,
            candidate_id=c.id,
            pack_key=pack.pack_key,
            disclosure_hash=pack.snapshot_hash,
            confirm_disclosure=False,
        )
        assert False
    except ValueError as exc:
        assert "disclosure_confirmation" in str(exc)
    try:
        cps.create_grant(
            db,
            candidate_id=c.id,
            pack_key=pack.pack_key,
            disclosure_hash="0" * 40,
            confirm_disclosure=True,
        )
        assert False
    except ValueError as exc:
        assert "disclosure_hash_mismatch" in str(exc)


def test_max_active_and_wipe():
    db, c = _db()
    for i in range(MAX_ACTIVE_GRANTS_PER_CANDIDATE):
        pack = _ready_pack(db, c, key=f"pack_max_{i}")
        cps.create_grant(
            db,
            candidate_id=c.id,
            pack_key=pack.pack_key,
            disclosure_hash=pack.snapshot_hash,
            confirm_disclosure=True,
        )
    pack_x = _ready_pack(db, c, key="pack_overflow")
    try:
        cps.create_grant(
            db,
            candidate_id=c.id,
            pack_key=pack_x.pack_key,
            disclosure_hash=pack_x.snapshot_hash,
            confirm_disclosure=True,
        )
        assert False
    except ValueError as exc:
        assert "max_active_grants" in str(exc)
    n = cps.wipe_all_grants_for_candidate(db, candidate_id=c.id)
    assert n >= MAX_ACTIVE_GRANTS_PER_CANDIDATE
    assert cps.count_active_grants(db, candidate_id=c.id) == 0


def test_download_permission_gate():
    db, c = _db()
    pack = _ready_pack(db, c, key="pack_dl")
    out = cps.create_grant(
        db,
        candidate_id=c.id,
        pack_key=pack.pack_key,
        permission="INLINE_VIEW",
        disclosure_hash=pack.snapshot_hash,
        confirm_disclosure=True,
    )
    secret = out["share_url_once"].split("#key=")[1]
    ok, token = cps.exchange_secret(db, public_id=out["public_id"], secret=secret)
    assert ok
    try:
        cps.recipient_download(
            db, public_id=out["public_id"], session_token=token, fmt="pdf"
        )
        assert False
    except ValueError as exc:
        assert "download_not_permitted" in str(exc)

    cps.revoke_grant(
        db, candidate_id=c.id, pack_key=pack.pack_key, grant_key=out["grant_key"]
    )
    out2 = cps.create_grant(
        db,
        candidate_id=c.id,
        pack_key=pack.pack_key,
        permission="INLINE_VIEW_AND_DOWNLOAD",
        disclosure_hash=pack.snapshot_hash,
        confirm_disclosure=True,
    )
    secret2 = out2["share_url_once"].split("#key=")[1]
    ok2, token2 = cps.exchange_secret(db, public_id=out2["public_id"], secret=secret2)
    assert ok2
    data, name, media = cps.recipient_download(
        db, public_id=out2["public_id"], session_token=token2, fmt="pdf"
    )
    assert media == "application/pdf"
    assert data.startswith(b"%PDF")
    cps.wipe_all_grants_for_candidate(db, candidate_id=c.id)
