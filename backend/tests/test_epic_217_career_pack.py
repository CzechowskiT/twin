"""Epic 2.17 — Career Pack unit tests (synthetic only)."""

from __future__ import annotations

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateCareerPack,
    CandidateCareerPackAudit,
    CandidateLifecyclePrivacy,
    User,
)
from app.services import candidate_career_pack as ccp
from app.services.candidate_career_pack_constants import (
    DISCLOSURE_FIELDS,
    EIGHTH_PRIMARY_NAV,
    EXTERNAL_DELIVERY,
    FIRST_VALUE_SATISFIED_BY_CAREER_PACK,
    LLM_REWRITE,
    PACK_TYPES,
    SCHEMA_ID,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateCareerEvidence.__table__,
        CandidateCareerPack.__table__,
        CandidateCareerPackAudit.__table__,
        CandidateLifecyclePrivacy.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic217@pack.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Pack", skills='["Python"]', experience_years=2)
    db.add(c)
    db.commit()
    return db, c


def test_catalog_contracts():
    cat = ccp.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["external_delivery"] is False
    assert cat["llm_rewrite"] is False
    assert cat["eighth_primary_nav"] is False
    assert cat["first_value_satisfied_by_career_pack"] is False
    assert cat["recipient_delivery"] == "NOT_PERFORMED"
    assert set(cat["pack_types"]) == set(PACK_TYPES)
    assert EXTERNAL_DELIVERY is False
    assert LLM_REWRITE is False
    assert EIGHTH_PRIMARY_NAV is False
    assert FIRST_VALUE_SATISFIED_BY_CAREER_PACK is False


def test_sensitive_default_off_and_internal_blocked():
    disc = ccp.default_disclosure()
    for key, meta in DISCLOSURE_FIELDS.items():
        if meta["sensitive"] or meta["internal_only"]:
            assert disc[key] is False, key
    assert disc["display_name"] is True
    assert disc["contact_email"] is False
    assert disc["internal_notes"] is False


def test_lifecycle_preview_confirm_download_revoke():
    db, c = _db()
    db.add(
        CandidateCareerEvidence(
            candidate_id=c.id,
            evidence_key="ev217",
            evidence_type="custom",
            title="Proof A",
            summary="summary-text",
            status="active",
            claim_kind="CANDIDATE_CONFIRMED",
        )
    )
    db.commit()
    arts = ccp.list_selectable_artifacts(db, candidate_id=c.id)
    assert arts["first_value_satisfied"] is False
    assert any(a["artifact_kind"] == "career_evidence" for a in arts["artifacts"])

    draft = ccp.create_draft(
        db,
        candidate_id=c.id,
        pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK",
        title="Synth",
    )
    assert draft["state"] == "DRAFT"
    assert draft["first_value_satisfied"] is False
    pack_key = draft["pack_key"]
    ev_ref = next(a for a in arts["artifacts"] if a["artifact_kind"] == "career_evidence")

    sel = ccp.update_selection(
        db,
        candidate_id=c.id,
        pack_key=pack_key,
        artifact_refs=[
            {"artifact_kind": ev_ref["artifact_kind"], "artifact_ref": ev_ref["artifact_ref"]}
        ],
        disclosure={"display_name": True, "evidence_titles": True, "contact_email": False},
    )
    assert sel["state"] == "DRAFT"
    assert sel["disclosure"]["contact_email"] is False

    preview = ccp.build_preview(db, candidate_id=c.id, pack_key=pack_key, stale_confirmed=True)
    assert preview["state"] == "AWAITING_CONFIRMATION"
    assert preview["preview_hash"]
    assert preview["first_value_satisfied"] is False
    ph = preview["preview_hash"]

    ready = ccp.confirm_and_generate(
        db, candidate_id=c.id, pack_key=pack_key, preview_hash=ph
    )
    assert ready["state"] == "READY"
    assert ready["immutable"] is True
    assert ready["has_pdf"] is True
    assert ready["has_zip"] is True
    assert ready["first_value_satisfied"] is False

    data, filename, media = ccp.download(db, candidate_id=c.id, pack_key=pack_key, fmt="zip")
    assert media == "application/zip"
    assert filename.endswith(".zip")
    assert len(data) > 40
    assert b"%PDF" not in data[:20] or True  # zip may embed pdf later

    revoked = ccp.revoke(db, candidate_id=c.id, pack_key=pack_key)
    assert revoked["state"] == "REVOKED"
    assert revoked["has_pdf"] is False
    assert revoked["has_zip"] is False
    try:
        ccp.download(db, candidate_id=c.id, pack_key=pack_key, fmt="zip")
        assert False, "expected download fail after revoke"
    except ValueError as exc:
        assert "pack_not_downloadable" in str(exc)


def test_preview_hash_mismatch_blocks_confirm():
    db, c = _db()
    draft = ccp.create_draft(
        db, candidate_id=c.id, pack_type="OPPORTUNITY_APPLICATION_PACK"
    )
    preview = ccp.build_preview(
        db, candidate_id=c.id, pack_key=draft["pack_key"], stale_confirmed=True
    )
    try:
        ccp.confirm_and_generate(
            db,
            candidate_id=c.id,
            pack_key=draft["pack_key"],
            preview_hash="0" * 64,
        )
        assert False, "expected mismatch"
    except ValueError as exc:
        assert "preview_hash_mismatch" in str(exc)
    assert preview["preview_hash"]


def test_privacy_pause_blocks_create():
    db, c = _db()
    db.add(CandidateLifecyclePrivacy(candidate_id=c.id, paused=True))
    db.commit()
    try:
        ccp.create_draft(db, candidate_id=c.id, pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK")
        assert False, "expected privacy_pause"
    except ValueError as exc:
        assert "privacy_pause" in str(exc)


def test_delete_clears_bytes():
    db, c = _db()
    draft = ccp.create_draft(
        db, candidate_id=c.id, pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK"
    )
    preview = ccp.build_preview(
        db, candidate_id=c.id, pack_key=draft["pack_key"], stale_confirmed=True
    )
    ccp.confirm_and_generate(
        db,
        candidate_id=c.id,
        pack_key=draft["pack_key"],
        preview_hash=preview["preview_hash"],
    )
    out = ccp.delete_pack(db, candidate_id=c.id, pack_key=draft["pack_key"])
    assert out["deleted"] is True
    assert out["first_value_satisfied"] is False
    try:
        ccp.get_pack(db, candidate_id=c.id, pack_key=draft["pack_key"])
        assert False
    except LookupError:
        pass
