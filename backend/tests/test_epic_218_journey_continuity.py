"""Epic 2.18 — Journey Continuity unit tests (synthetic only)."""

from __future__ import annotations

from datetime import datetime

from app.database.models import (
    Candidate,
    CandidateAppStudioWorkspace,
    CandidateCareerPack,
    CandidateDataTrustReview,
    CandidateDecisionRecord,
    CandidateImportBatch,
    CandidateLifecyclePrivacy,
    CandidatePathReadinessSession,
    User,
)
from app.services import candidate_journey_continuity as cjc
from app.services.candidate_journey_continuity_constants import (
    ADAPTER_CAPABILITIES,
    EIGHTH_PRIMARY_NAV,
    FIRST_VALUE_SATISFIED_BY_CONTINUITY,
    FLOW_KINDS,
    PARALLEL_CHECKPOINT_STORE,
    SCHEMA_ID,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidatePathReadinessSession.__table__,
        CandidateImportBatch.__table__,
        CandidateDataTrustReview.__table__,
        CandidateCareerPack.__table__,
        CandidateAppStudioWorkspace.__table__,
        CandidateDecisionRecord.__table__,
        CandidateLifecyclePrivacy.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic218@cont.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Cont", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, c, u


def test_catalog_and_parallel_store_none():
    cat = cjc.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["parallel_checkpoint_store"] == "NONE"
    assert PARALLEL_CHECKPOINT_STORE == "NONE"
    assert cat["eighth_primary_nav"] is False
    assert EIGHTH_PRIMARY_NAV is False
    assert cat["first_value_satisfied_by_continuity"] is False
    assert FIRST_VALUE_SATISFIED_BY_CONTINUITY is False
    assert cat["email_push_reminders"] is False
    assert cat["behavioral_surveillance"] is False
    assert len(cat["flow_kinds"]) == 6
    assert set(cat["flow_kinds"]) == set(FLOW_KINDS)
    assert cat["adapter_matrix_cells"] == 48


def test_adapter_matrix_48():
    m = cjc.adapter_matrix()
    assert m["total"] == 48
    assert m["pass_count"] == 48
    assert len(m["cells"]) == len(FLOW_KINDS) * len(ADAPTER_CAPABILITIES)


def test_path_readiness_checkpoint_resume_exact():
    db, c, _ = _db()
    out = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="CANDIDATE_PATH_READINESS",
        owner_ref=None,
        step_key="selected",
        explicit=True,
    )
    assert out["created"] is True
    assert out["first_value_satisfied"] is False
    assert out["flow_kind"] == "CANDIDATE_PATH_READINESS"
    sk = out["session_key"]
    resumed = cjc.resume(db, candidate_id=c.id, session_key=sk, client_revision=1)
    assert resumed["resume_mode"] == "EXACT_CHECKPOINT"
    assert resumed["mutates_on_resume"] is False


def test_stale_client_revision_safe_review():
    db, c, _ = _db()
    out = cjc.checkpoint(
        db, candidate_id=c.id, flow_kind="CANDIDATE_PATH_READINESS", explicit=True
    )
    sk = out["session_key"]
    cjc.bump_revision(db, candidate_id=c.id, session_key=sk)
    resumed = cjc.resume(db, candidate_id=c.id, session_key=sk, client_revision=1)
    assert resumed["resume_mode"] == "SAFE_REVIEW"
    assert resumed["reason"] == "stale_client_revision"


def test_career_pack_adapter_and_invalidate():
    db, c, _ = _db()
    pack = CandidateCareerPack(
        candidate_id=c.id,
        pack_key="pack_synth218",
        pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK",
        state="DRAFT",
        schema_version="twin.candidate_career_pack/v1",
        title="Synth",
        artifact_refs_json="[]",
        disclosure_json="{}",
        preview_json="{}",
        snapshot_json="{}",
        immutable=False,
        external_delivery=False,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=datetime.utcnow(),
    )
    db.add(pack)
    db.commit()
    cp = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="CAREER_PACK_DRAFT",
        owner_ref="pack_synth218",
        explicit=True,
    )
    assert cp["route_key"] == "career_pack"
    pack.state = "READY"
    db.commit()
    resumed = cjc.resume(db, candidate_id=c.id, session_key=cp["session_key"])
    assert resumed["resume_mode"] == "INVALID"


def test_data_trust_cannot_resolve_via_continuity():
    db, c, _ = _db()
    rev = CandidateDataTrustReview(
        candidate_id=c.id,
        review_key="rev218",
        status="OPEN",
        claim_kind="FACT",
        kpi_excluded=True,
    )
    db.add(rev)
    db.commit()
    cp = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="DATA_TRUST_REVIEW",
        owner_ref="rev218",
        explicit=True,
    )
    resumed = cjc.resume(db, candidate_id=c.id, session_key=cp["session_key"])
    assert resumed["resume_mode"] == "EXACT_CHECKPOINT"
    assert resumed["adapter"]["can_resolve"] is False


def test_lifecycle_approval_open_only():
    db, c, _ = _db()
    dec = CandidateDecisionRecord(
        candidate_id=c.id,
        decision_key="dec218",
        status="PENDING",
        claim_kind="FACT",
    )
    db.add(dec)
    db.commit()
    cp = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="LIFECYCLE_APPROVAL_REVIEW",
        owner_ref="dec218",
        explicit=True,
    )
    resumed = cjc.resume(db, candidate_id=c.id, session_key=cp["session_key"])
    assert resumed["resume_mode"] == "EXACT_CHECKPOINT"
    assert resumed["adapter"]["approval_mutation"] is False


def test_explicit_required_and_privacy_pause():
    db, c, _ = _db()
    try:
        cjc.checkpoint(
            db,
            candidate_id=c.id,
            flow_kind="CANDIDATE_PATH_READINESS",
            explicit=False,
        )
        assert False
    except ValueError as exc:
        assert "explicit" in str(exc)
    db.add(CandidateLifecyclePrivacy(candidate_id=c.id, paused=True))
    db.commit()
    try:
        cjc.checkpoint(
            db, candidate_id=c.id, flow_kind="CANDIDATE_PATH_READINESS", explicit=True
        )
        assert False
    except ValueError as exc:
        assert "privacy_pause" in str(exc)


def test_pin_pause_clear_continue_list():
    db, c, _ = _db()
    cp = cjc.checkpoint(
        db, candidate_id=c.id, flow_kind="CANDIDATE_PATH_READINESS", explicit=True
    )
    sk = cp["session_key"]
    pinned = cjc.pin(db, candidate_id=c.id, session_key=sk, pinned=True)
    assert pinned["pinned"] is True
    paused = cjc.pause(db, candidate_id=c.id, session_key=sk, paused=True)
    assert paused["paused"] is True
    items = cjc.list_continue(db, candidate_id=c.id)
    assert items["count"] >= 1
    assert items["urgency"] is False
    assert items["first_value_satisfied"] is False
    cleared = cjc.clear(db, candidate_id=c.id, session_key=sk)
    assert cleared["cleared"] is True
    items2 = cjc.list_continue(db, candidate_id=c.id)
    assert all(i["session_key"] != sk for i in items2["items"])


def test_app_studio_and_import_adapters():
    db, c, u = _db()
    ws = CandidateAppStudioWorkspace(
        candidate_id=c.id,
        workspace_key="ws218",
        title="WS218",
        status="draft",
        claim_kind="FACT",
    )
    db.add(ws)
    db.flush()
    batch = CandidateImportBatch(
        candidate_id=c.id,
        user_id=u.id,
        batch_key="batch218",
        family="cv",
        state="STAGED",
    )
    db.add(batch)
    db.commit()
    a = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="APPLICATION_STUDIO_DRAFT",
        owner_ref=str(ws.id),
        explicit=True,
    )
    b = cjc.checkpoint(
        db,
        candidate_id=c.id,
        flow_kind="CANDIDATE_IMPORT_REVIEW",
        owner_ref="batch218",
        explicit=True,
    )
    assert a["href"].endswith("/application-studio")
    assert b["href"].endswith("/import")
    cont = cjc.list_continue(db, candidate_id=c.id)
    kinds = {i["flow_kind"] for i in cont["items"]}
    assert "APPLICATION_STUDIO_DRAFT" in kinds
    assert "CANDIDATE_IMPORT_REVIEW" in kinds
