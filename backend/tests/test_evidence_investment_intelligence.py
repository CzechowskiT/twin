"""Epic 2.8 — Evidence Investment Intelligence."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAllocationCalibration,
    CandidateAllocationPolicy,
    CandidateEvidenceGapSnapshot,
    CandidateInvestmentArtifactDraft,
    CandidateInvestmentAudit,
    CandidateInvestmentExperiment,
    CandidateInvestmentObservation,
    CandidateInvestmentPortfolioSnapshot,
    CandidateInvestmentPromotion,
    CandidateInvestmentQuestion,
    CandidateInvestmentSimulation,
    CandidateInvestmentUsefulness,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecyclePrivacy,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "evidence-investment-intel-test-secret-32!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateLifecycleContext.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateLifecycleEvent.__table__,
        CandidateInvestmentQuestion.__table__,
        CandidateEvidenceGapSnapshot.__table__,
        CandidateInvestmentExperiment.__table__,
        CandidateInvestmentSimulation.__table__,
        CandidateInvestmentObservation.__table__,
        CandidateInvestmentArtifactDraft.__table__,
        CandidateInvestmentPromotion.__table__,
        CandidateInvestmentUsefulness.__table__,
        CandidateAllocationCalibration.__table__,
        CandidateAllocationPolicy.__table__,
        CandidateInvestmentPortfolioSnapshot.__table__,
        CandidateInvestmentAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="eii@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="EII Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer",
    )
    db.add(cand)
    db.flush()
    db.add(
        CandidateLifecyclePrivacy(
            candidate_id=cand.id,
            orchestration_opt_in=True,
            search_opt_in=True,
            learning_opt_in=True,
            reminders_opt_in=True,
            paused=False,
            version=1,
        )
    )
    db.commit()

    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app), db, cand


def test_evidence_investment_intelligence_flow(monkeypatch):
    client, db, cand = _setup(monkeypatch)

    agg = client.get("/api/v1/candidates/me/evidence-investment")
    assert agg.status_code == 200, agg.text
    body = agg.json()
    assert body["alembic"] == "124_evidence_investment_intelligence"
    assert body["schema"] == "twin.evidence_investment_intelligence/v1"
    assert body["safety"]["absence_means_no_skill"] is False
    assert body["safety"]["skill_mastery_inferred"] is False
    assert body["safety"]["experiment_without_approval"] is False
    assert body["safety"]["rejected_creates_commitments"] is False
    assert body["safety"]["external_purchase"] is False
    assert body["safety"]["external_enrollment"] is False
    assert body["safety"]["silent_artifact_promotion"] is False
    assert body["safety"]["draft_influences_ranking"] is False
    assert body["safety"]["causal_outcome_attribution"] is False
    assert body["safety"]["silent_allocation_calibration"] is False
    assert body["safety"]["historic_snapshots_rewritten"] is False
    assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
    assert body["safety"]["lms_marketplace"] is False

    q = client.post(
        "/api/v1/candidates/me/evidence-investment/questions",
        json={"title": "Strengthen portfolio depth"},
    )
    assert q.status_code == 201, q.text
    qid = q.json()["id"]

    gap = client.post(
        "/api/v1/candidates/me/evidence-investment/gaps",
        json={"question_id": qid},
    )
    assert gap.status_code == 201, gap.text
    assert gap.json()["absence_means_no_skill"] is False
    assert gap.json()["immutable"] is True

    exp = client.post(
        "/api/v1/candidates/me/evidence-investment/experiments",
        json={"question_id": qid, "gap_snapshot_id": gap.json()["id"]},
    )
    assert exp.status_code == 201, exp.text
    eid = exp.json()["id"]
    assert exp.json()["external_purchase"] is False
    assert exp.json()["external_enrollment"] is False

    sim = client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/simulate",
        json={"effort_minutes": 90},
    )
    assert sim.status_code == 201, sim.text
    assert sim.json()["mutates_state"] is False

    prop = client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/propose",
        json={"selected_alternative_id": "build_artifact"},
    )
    assert prop.status_code == 201, prop.text
    assert prop.json()["requires_approval"] is True
    assert prop.json()["silent"] is False

    rej = client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/resolve",
        json={"action": "reject"},
    )
    assert rej.status_code == 200, rej.text
    assert rej.json()["commitments_created"] is False
    assert rej.json()["external_purchase"] is False

    exp2 = client.post("/api/v1/candidates/me/evidence-investment/experiments", json={})
    eid2 = exp2.json()["id"]
    client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/propose",
        json={"selected_alternative_id": "build_artifact"},
    )
    appr = client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/resolve",
        json={"action": "approve"},
    )
    assert appr.status_code == 200
    assert appr.json()["experiment"]["status"] == "approved"

    rev = client.post(
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/review",
        json={"decision": "pause"},
    )
    assert rev.status_code == 200
    assert rev.json()["decision"] == "pause"

    draft = client.post(
        "/api/v1/candidates/me/evidence-investment/artifacts",
        json={"experiment_id": eid2, "title": "Draft artifact"},
    )
    assert draft.status_code == 201
    assert draft.json()["influences_ranking"] is False
    did = draft.json()["id"]

    promo = client.post(f"/api/v1/candidates/me/evidence-investment/artifacts/{did}/promote")
    assert promo.status_code == 201
    assert promo.json()["requires_approval"] is True
    assert promo.json()["silent"] is False
    pid = promo.json()["promotion"]["id"]

    promo_ok = client.post(
        f"/api/v1/candidates/me/evidence-investment/promotions/{pid}/resolve",
        json={"action": "approve"},
    )
    assert promo_ok.status_code == 200
    assert promo_ok.json()["ranking_influenced"] is False
    assert promo_ok.json()["external_acceptance"] is False

    use = client.post(
        "/api/v1/candidates/me/evidence-investment/usefulness",
        json={"experiment_id": eid2, "draft_id": did, "body": {"useful": True}},
    )
    assert use.status_code == 201
    assert use.json()["causal_outcome"] is False

    cal = client.post("/api/v1/candidates/me/evidence-investment/allocation/calibrate")
    assert cal.status_code == 201
    assert cal.json()["silent"] is False
    cid = cal.json()["calibration"]["id"]
    cal_ok = client.post(
        f"/api/v1/candidates/me/evidence-investment/allocation/calibrations/{cid}/resolve",
        json={"action": "approve"},
    )
    assert cal_ok.status_code == 200
    assert cal_ok.json()["historic_snapshots_rewritten"] is False

    cal_rev = client.post(
        f"/api/v1/candidates/me/evidence-investment/allocation/calibrations/{cid}/revert"
    )
    assert cal_rev.status_code == 200
    assert cal_rev.json()["historic_snapshots_rewritten"] is False

    pol = client.post(
        "/api/v1/candidates/me/evidence-investment/policies",
        json={"body": {"weekly_learning_minutes": 120}},
    )
    assert pol.status_code == 201
    pol_id = pol.json()["policy"]["id"]
    psim = client.post(f"/api/v1/candidates/me/evidence-investment/policies/{pol_id}/simulate")
    assert psim.status_code == 201
    assert psim.json()["mutates_state"] is False

    health = client.get("/api/v1/candidates/me/evidence-investment/health")
    assert health.status_code == 200
    assert health.json()["skill_mastery_inferred"] is False

    exp_out = client.get("/api/v1/candidates/me/evidence-investment/export")
    assert exp_out.status_code == 200
    assert exp_out.json()["skill_mastery_excluded"] is True

    dh = client.post("/api/v1/candidates/me/evidence-investment/delete-history")
    assert dh.status_code == 200
    assert dh.json()["propagated"] is True

    # soft-deleted experiments should not appear
    agg2 = client.get("/api/v1/candidates/me/evidence-investment")
    assert agg2.status_code == 200
    assert agg2.json()["experiments"] == []
