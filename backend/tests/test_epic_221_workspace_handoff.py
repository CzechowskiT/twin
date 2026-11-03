"""Epic 2.21 — Workspace handoff unit tests."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.database.models import (
    Candidate,
    CandidateAppStudioWorkspace,
    CandidateCareerPack,
    CandidateDataTrustReview,
    CandidateImportBatch,
    User,
)
from app.services import candidate_workspace_handoff as cwh
from app.services.candidate_workspace_handoff_constants import (
    MAX_DEPTH,
    PARALLEL_HANDOFF_OR_CHECKPOINT_STORE,
    REGISTRY_SCHEMA_ID,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateImportBatch.__table__,
        CandidateDataTrustReview.__table__,
        CandidateAppStudioWorkspace.__table__,
        CandidateCareerPack.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic221@handoff.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth Handoff", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, u, c


def test_catalog_no_parallel_store():
    cat = cwh.catalog()
    assert cat["schema_id"] == REGISTRY_SCHEMA_ID
    assert cat["parallel_handoff_or_checkpoint_store"] == "NONE"
    assert cat["mutations_at_handoff_layer"] is False
    assert cat["first_value_satisfied_by_handoff"] is False
    assert cat["continuity_sole_continue_owner"] is True
    assert len(cat["handoffs"]) >= 5


def test_create_resolve_import_to_data_trust():
    db, u, c = _db()
    batch = CandidateImportBatch(
        candidate_id=c.id,
        user_id=u.id,
        batch_key="batch_h221",
        family="document",
        state="COMMITTED",
        staging_json="[]",
        preview_json="{}",
        approval_json="{}",
        commit_json="{}",
        rollback_json="{}",
        audit_json="[]",
        created_at=datetime.utcnow(),
    )
    db.add(batch)
    db.commit()

    created = cwh.create_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handoff_id="import_to_data_trust",
        object_ref="batch_h221",
    )
    assert created["created"] is True
    assert created["mutations"] is False
    assert created["authorization"] is False
    handle = created["handle_once"]
    assert handle and "batch_h221" not in handle  # opaque

    resolved = cwh.resolve_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handle=handle,
        expected_dest_route_key="data_trust",
    )
    assert resolved["ok"] is True
    assert resolved["object_ref"] == "batch_h221"
    assert resolved["return_href"] == "/dashboard/import"
    assert resolved["mutations"] is False
    assert resolved["next_best_action"] is False


def test_max_depth_and_not_allowlisted():
    db, u, c = _db()
    ws = CandidateAppStudioWorkspace(
        candidate_id=c.id,
        workspace_key="ws_h221",
        title="Synth",
        status="draft",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    h1 = cwh.create_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handoff_id="app_studio_to_career_pack",
        object_ref=str(ws.id),
    )["handle_once"]
    # Chain depth: create child with parent repeatedly until max
    parent = h1
    for _ in range(MAX_DEPTH - 1):
        parent = cwh.create_handoff(
            db,
            user=u,
            candidate_id=c.id,
            handoff_id="app_studio_to_career_pack",
            object_ref=str(ws.id),
            parent_handle=parent,
        )["handle_once"]
    with pytest.raises(ValueError, match="max_depth"):
        cwh.create_handoff(
            db,
            user=u,
            candidate_id=c.id,
            handoff_id="app_studio_to_career_pack",
            object_ref=str(ws.id),
            parent_handle=parent,
        )
    with pytest.raises(ValueError, match="handoff_not_allowlisted"):
        cwh.create_handoff(
            db,
            user=u,
            candidate_id=c.id,
            handoff_id="any_to_any",
            object_ref="x",
        )


def test_wrong_candidate_unavailable():
    db, u, c = _db()
    pack = CandidateCareerPack(
        candidate_id=c.id,
        pack_key="pk_h221",
        pack_type="GENERAL_EVIDENCE_PORTFOLIO_PACK",
        state="READY",
        schema_version="v1",
        title="t",
        artifact_refs_json="[]",
        disclosure_json="{}",
        preview_json="{}",
        snapshot_hash="snap" + "b" * 40,
        immutable=True,
        created_at=datetime.utcnow(),
    )
    db.add(pack)
    db.commit()
    created = cwh.create_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handoff_id="career_pack_to_access_center",
        object_ref="pk_h221",
        object_revision=pack.snapshot_hash,
    )
    u2 = User(
        email="other221@handoff.test",
        hashed_password="x",
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u2)
    db.flush()
    c2 = Candidate(user_id=u2.id, name="Other", skills="[]", experience_years=1)
    db.add(c2)
    db.commit()
    with pytest.raises(LookupError):
        cwh.resolve_handoff(
            db, user=u2, candidate_id=c2.id, handle=created["handle_once"]
        )


def test_data_trust_to_path_home():
    db, u, c = _db()
    review = CandidateDataTrustReview(
        candidate_id=c.id,
        review_key="rev_h221",
        trigger_kind="import_commit",
        status="OPEN",
        created_at=datetime.utcnow(),
    )
    db.add(review)
    db.commit()
    created = cwh.create_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handoff_id="data_trust_to_path_home",
        object_ref="rev_h221",
    )
    resolved = cwh.resolve_handoff(
        db,
        user=u,
        candidate_id=c.id,
        handle=created["handle_once"],
        expected_dest_route_key="path_home",
    )
    assert resolved["ok"] is True
    assert resolved["return_href"] == "/dashboard/data-trust"
    assert resolved["authorization"] is False


assert PARALLEL_HANDOFF_OR_CHECKPOINT_STORE == "NONE"
