"""Epic 2.15 — candidate data trust unit tests (synthetic only)."""

from __future__ import annotations

import json

from app.database.models import (
    Candidate,
    CandidateDataTrustChangeSet,
    CandidateDataTrustQuestion,
    CandidateDataTrustReview,
    CandidateDecisionRecord,
    CandidateLifecycleApproval,
    CandidateLifecycleFinding,
    User,
)
from app.services import candidate_data_trust as cdt
from app.services.candidate_data_trust_constants import (
    AUTO_REPAIR,
    COVERAGE_EXCLUDED,
    COVERAGE_INCLUDED,
    FIRST_VALUE_SATISFIED_BY_DATA_TRUST,
    FUZZY_OR_LLM_CONFLICT,
    SCHEMA_ID,
    TRUST_QUALITY_SCORES,
)
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateDataTrustReview.__table__,
        CandidateDataTrustQuestion.__table__,
        CandidateDataTrustChangeSet.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateDecisionRecord.__table__,
        CandidateLifecycleFinding.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic215@trust.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth", skills=json.dumps(["python"]), experience_years=2)
    db.add(c)
    db.commit()
    return db, c


def test_catalog_and_coverage():
    cat = cdt.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["auto_repair"] is False
    assert cat["fuzzy_or_llm_conflict"] is False
    assert cat["trust_quality_scores"] is False
    assert cat["first_value_satisfied_by_data_trust"] is False
    assert cat["eighth_primary_nav"] is False
    matrix = cdt.coverage_matrix()
    domains = {r["domain"] for r in matrix["matrix"]}
    assert COVERAGE_INCLUDED.issubset(domains)
    assert COVERAGE_EXCLUDED.issubset(domains)
    assert AUTO_REPAIR is False
    assert FUZZY_OR_LLM_CONFLICT is False
    assert TRUST_QUALITY_SCORES is False
    assert FIRST_VALUE_SATISFIED_BY_DATA_TRUST is False


def test_post_commit_spawn_and_full_flow():
    db, c = _db()
    created = [
        {"kind": "evidence", "id": 1, "item_key": "i1"},
        {"kind": "profile", "id": c.id, "item_key": "i2"},
    ]
    review = cdt.spawn_post_commit_review(
        db,
        candidate_id=c.id,
        import_batch_key="batch_test_215",
        created=created,
    )
    assert review is not None
    assert review["first_value_satisfied"] is False
    assert review["status"] == "IN_REVIEW"
    assert len(review["questions"]) >= 3
    families = {q["rule_family"] for q in review["questions"]}
    assert "EVIDENCE_DUPLICATE_OR_CONFLICT" in families
    assert "PROVENANCE_MISMATCH" in families

    rk = review["review_key"]
    q0 = review["questions"][0]
    out = cdt.resolve_question(
        db,
        candidate_id=c.id,
        review_key=rk,
        question_key=q0["question_key"],
        resolution_action="REPLACE_WITH_INCOMING",
    )
    assert out["version"] >= 2

    # Resolve remaining with DISMISS so preview can proceed
    for q in out["questions"]:
        if q["status"] == "COMPARED":
            cdt.resolve_question(
                db,
                candidate_id=c.id,
                review_key=rk,
                question_key=q["question_key"],
                resolution_action="DISMISS",
            )

    prev = cdt.build_impact_preview(db, candidate_id=c.id, review_key=rk)
    assert prev["impact_preview"]["mutates_on_preview"] is False
    assert prev["impact_preview_version"] >= 1
    assert prev["first_value_satisfied"] is False

    proposed = cdt.propose_change_set(db, candidate_id=c.id, review_key=rk)
    assert proposed["requires_approval"] is True
    assert proposed["silent"] is False
    cs_key = proposed["change_set"]["change_set_key"]

    resolved = cdt.resolve_review(
        db, candidate_id=c.id, review_key=rk, action="approve"
    )
    assert resolved["review"]["status"] == "APPLIED"
    assert resolved["first_value_satisfied"] is False
    assert resolved["external_action"] is False

    undone = cdt.undo_change_set(db, candidate_id=c.id, change_set_key=cs_key)
    assert undone["undone"] is True
    assert undone["first_value_satisfied"] is False


def test_stale_only_when_previewed():
    db, c = _db()
    db.add(
        CandidateDecisionRecord(
            candidate_id=c.id,
            decision_key="d215",
            question_json="{}",
            evidence_package_json="{}",
            alternatives_json="[]",
            counterfactuals_json="[]",
            rationale_json="{}",
            status="draft",
            stale=False,
            claim_kind="SUGGESTION",
            kpi_excluded=True,
        )
    )
    db.commit()
    review = cdt.spawn_post_commit_review(
        db,
        candidate_id=c.id,
        import_batch_key="b2",
        created=[{"kind": "profile", "id": c.id, "item_key": "p1"}],
    )
    rk = review["review_key"]
    for q in review["questions"]:
        action = (
            "REPLACE_WITH_INCOMING"
            if q["domain"] in {"skills", "profile"}
            else "DISMISS"
        )
        cdt.resolve_question(
            db,
            candidate_id=c.id,
            review_key=rk,
            question_key=q["question_key"],
            resolution_action=action,
        )
    prev = cdt.build_impact_preview(db, candidate_id=c.id, review_key=rk)
    assert "decision_records" in prev["impact_preview"]["dependents_to_mark_stale_if_approved"]
    cdt.propose_change_set(db, candidate_id=c.id, review_key=rk)
    cdt.resolve_review(db, candidate_id=c.id, review_key=rk, action="approve")
    dec = db.query(CandidateDecisionRecord).filter_by(candidate_id=c.id).one()
    assert dec.stale is True


def test_empty_created_no_review():
    db, c = _db()
    assert (
        cdt.spawn_post_commit_review(
            db, candidate_id=c.id, import_batch_key="empty", created=[]
        )
        is None
    )


def test_reject_leaves_canonical():
    db, c = _db()
    skills_before = c.skills
    review = cdt.spawn_post_commit_review(
        db,
        candidate_id=c.id,
        import_batch_key="b3",
        created=[{"kind": "evidence", "id": 9, "item_key": "e9"}],
    )
    rk = review["review_key"]
    for q in review["questions"]:
        cdt.resolve_question(
            db,
            candidate_id=c.id,
            review_key=rk,
            question_key=q["question_key"],
            resolution_action="DISMISS",
        )
    cdt.build_impact_preview(db, candidate_id=c.id, review_key=rk)
    cdt.propose_change_set(db, candidate_id=c.id, review_key=rk)
    out = cdt.resolve_review(db, candidate_id=c.id, review_key=rk, action="reject")
    assert out["state_mutated"] is False
    db.refresh(c)
    assert c.skills == skills_before
