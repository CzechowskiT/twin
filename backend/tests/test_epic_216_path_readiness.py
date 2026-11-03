"""Epic 2.16 — path readiness unit tests (synthetic only)."""

from __future__ import annotations

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateDecisionRecord,
    CandidateNormalizedOpportunity,
    CandidatePathReadinessSession,
    User,
)
from app.services import candidate_path_readiness as cpr
from app.services.candidate_path_readiness_constants import (
    BANNED_COPY_PHRASES,
    EIGHTH_PRIMARY_NAV,
    FIRST_VALUE_SATISFIED_BY_PATH_READINESS,
    PATH_KINDS,
    PERSON_EMPLOYABILITY_SCORES,
    RECOMMENDS_BEST_PATH,
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
        CandidateNormalizedOpportunity.__table__,
        CandidateCareerEvidence.__table__,
        CandidateDecisionRecord.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u = User(
        email="epic216@path.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(u)
    db.flush()
    c = Candidate(user_id=u.id, name="Synth", skills="[]", experience_years=1)
    db.add(c)
    db.commit()
    return db, c


def test_catalog_contracts():
    cat = cpr.catalog()
    assert cat["schema_id"] == SCHEMA_ID
    assert cat["recommends_best_path"] is False
    assert cat["person_employability_scores"] is False
    assert cat["eighth_primary_nav"] is False
    assert cat["first_value_satisfied_by_path_readiness"] is False
    assert cat["mutates_on_evaluate"] is False
    assert len(cat["path_kinds"]) == 5
    assert set(cat["path_kinds"]) == set(PATH_KINDS)
    assert RECOMMENDS_BEST_PATH is False
    assert PERSON_EMPLOYABILITY_SCORES is False
    assert EIGHTH_PRIMARY_NAV is False
    assert FIRST_VALUE_SATISFIED_BY_PATH_READINESS is False


def test_healthy_empty_is_startable_not_blocked():
    db, c = _db()
    opts = cpr.list_path_options(db, candidate_id=c.id)
    assert opts["mutations"] == 0
    assert opts["recommends_best_path"] is False
    for p in opts["paths"]:
        assert p["path_state"] == "STARTABLE"
        assert p["recommended"] is False
        assert p["score"] is None


def test_select_without_object_startable():
    db, c = _db()
    out = cpr.select_path(
        db, candidate_id=c.id, path_kind="EVALUATE_ONE_OPPORTUNITY", object_ref=None
    )
    assert out["path_state"] == "STARTABLE"
    assert out["mutations"] == 0
    assert out["first_value_satisfied"] is False
    assert out["person_employability_scores"] is False


def test_blocked_when_object_missing_evidence():
    db, c = _db()
    opp = CandidateNormalizedOpportunity(
        candidate_id=c.id,
        opportunity_key="ok216",
        title="Role",
        company="Co",
        dedupe_key="d216",
        claim_kind="SOURCE_SUPPORTED",
        kpi_excluded=True,
    )
    db.add(opp)
    db.commit()
    out = cpr.select_path(
        db,
        candidate_id=c.id,
        path_kind="EVALUATE_ONE_OPPORTUNITY",
        object_ref=str(opp.id),
    )
    assert out["path_state"] == "BLOCKED"
    keys = {r["requirement_key"] for r in out["requirements"]}
    assert "evidence_for_evaluation" in keys
    assert out["resolution_routes"]
    assert all(r["mutates_on_click"] is False for r in out["resolution_routes"])
    assert all(cpr.assert_copy_safe(r["explanation"]) for r in out["resolution_routes"])


def test_complete_when_evidence_present():
    db, c = _db()
    opp = CandidateNormalizedOpportunity(
        candidate_id=c.id,
        opportunity_key="ok216b",
        title="Role B",
        company="Co",
        dedupe_key="d216b",
        claim_kind="SOURCE_SUPPORTED",
        kpi_excluded=True,
    )
    db.add(opp)
    db.add(
        CandidateCareerEvidence(
            candidate_id=c.id,
            evidence_key="ev216",
            evidence_type="custom",
            title="Proof",
            summary="s",
            status="active",
            claim_kind="CANDIDATE_DECLARED",
        )
    )
    db.commit()
    out = cpr.select_path(
        db,
        candidate_id=c.id,
        path_kind="EVALUATE_ONE_OPPORTUNITY",
        object_ref=str(opp.id),
    )
    assert out["path_state"] == "COMPLETE"
    assert out["first_value_satisfied"] is False


def test_click_never_first_value():
    db, c = _db()
    out = cpr.select_path(db, candidate_id=c.id, path_kind="REVIEW_ONE_CAREER_DECISION")
    click = cpr.record_route_click(
        db,
        candidate_id=c.id,
        session_key=out["session_key"],
        deep_link="/dashboard/approvals",
    )
    assert click["satisfies_first_value"] is False
    assert click["mutations"] == 0


def test_banned_copy():
    assert cpr.assert_copy_safe("Open Opportunities to pick another.") is True
    for phrase in BANNED_COPY_PHRASES:
        assert cpr.assert_copy_safe(f"You are {phrase} now") is False


def test_data_trust_recalc_no_auto_continue():
    db, c = _db()
    out = cpr.select_path(db, candidate_id=c.id, path_kind="PREPARE_ONE_APPLICATION")
    recalc = cpr.recalculate_after_data_trust(
        db, candidate_id=c.id, session_key=out["session_key"]
    )
    assert recalc["auto_continue"] is False
    assert recalc["data_trust_handoff_return"] is True
    assert recalc["first_value_satisfied"] is False
