"""Epic 2.4 — Strategy Review + Decision Governance."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateDecisionFollowup,
    CandidateDecisionRecord,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    CandidateNormalizedOpportunity,
    CandidateOpportunityClusterSummary,
    CandidateRecommendationWeights,
    CandidateRoleThesis,
    CandidateSavedSearch,
    CandidateSearchCycle,
    CandidateSearchExperiment,
    CandidateSearchFunnelSnapshot,
    CandidateSearchOutcomeAttribution,
    CandidateSearchOutcomeAudit,
    CandidateSearchOutcomeCalibration,
    CandidateSearchOutcomeEvent,
    CandidateSearchOutcomeFeedback,
    CandidateSearchOutcomeLinkage,
    CandidateSearchOutcomeReview,
    CandidateSearchPortfolio,
    CandidateSearchStrategy,
    CandidateSearchStrategyAudit,
    CandidateStrategyAssumption,
    CandidateStrategyChangeSet,
    CandidateStrategyReviewAudit,
    CandidateStrategyReviewObservation,
    CandidateStrategyReviewSession,
    Job,
    OpportunitySource,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "strategy-review-gov-test-secret-32chars!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        Job.__table__,
        OpportunitySource.__table__,
        CandidateNormalizedOpportunity.__table__,
        CandidateCareerEvidence.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateRecommendationWeights.__table__,
        CandidateLifecycleContext.__table__,
        CandidateLifecycleEvent.__table__,
        CandidateLifecycleHandoff.__table__,
        CandidateLifecycleFinding.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateSearchStrategy.__table__,
        CandidateRoleThesis.__table__,
        CandidateSearchPortfolio.__table__,
        CandidateSavedSearch.__table__,
        CandidateSearchExperiment.__table__,
        CandidateSearchCycle.__table__,
        CandidateSearchStrategyAudit.__table__,
        CandidateSearchOutcomeLinkage.__table__,
        CandidateSearchOutcomeEvent.__table__,
        CandidateSearchFunnelSnapshot.__table__,
        CandidateSearchOutcomeAttribution.__table__,
        CandidateSearchOutcomeCalibration.__table__,
        CandidateSearchOutcomeFeedback.__table__,
        CandidateSearchOutcomeReview.__table__,
        CandidateSearchOutcomeAudit.__table__,
        CandidateStrategyReviewSession.__table__,
        CandidateStrategyReviewObservation.__table__,
        CandidateOpportunityClusterSummary.__table__,
        CandidateStrategyAssumption.__table__,
        CandidateDecisionRecord.__table__,
        CandidateStrategyChangeSet.__table__,
        CandidateDecisionFollowup.__table__,
        CandidateStrategyReviewAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="stratrev@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Review Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer Python",
    )
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
        email="stratrev@example.com"
    ).one()
    return db, cand, TestClient(app), app, get_settings


def test_strategy_review_decision_governance_flow(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/strategy-reviews")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "120_strategy_review_decision_governance"
        assert body["schema"] == "twin.strategy_review_decision_governance/v1"
        assert body["safety"]["silent_strategy_change"] is False
        assert body["safety"]["fabricated_cluster_progress"] is False
        assert body["safety"]["reject_mutates_state"] is False
        assert body["safety"]["daily_os_404"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["routes"]["review_center"] == "/dashboard/review-center"
        assert body["routes"]["decision_journal"] == "/dashboard/decision-journal"
        assert body["routes"]["daily_os_canonical"] == "/api/v1/candidates/me/career-copilot/daily"

        # Seed linkage so clusters leave INSUFFICIENT_DATA
        ln = client.post(
            "/api/v1/candidates/me/search-outcomes/linkages",
            json={
                "stage": "OPPORTUNITY_SEEN",
                "provenance": "CANDIDATE_DECLARED",
                "source_key": "pracuj",
                "opportunity_ref_id": 101,
            },
        )
        assert ln.status_code == 201, ln.text

        clusters = client.post("/api/v1/candidates/me/strategy-reviews/clusters/refresh")
        assert clusters.status_code == 200
        assert clusters.json()["status"] == "OBSERVED"
        assert clusters.json()["demand_claim"] is False
        assert clusters.json()["fabricated_progress"] is False
        assert clusters.json()["clusters"]

        weekly = client.post(
            "/api/v1/candidates/me/strategy-reviews/sessions",
            json={"cadence": "weekly"},
        )
        assert weekly.status_code == 201, weekly.text
        rev = weekly.json()["review"]
        rid = rev["id"]
        assert rev["silent_strategy_change"] is False
        assert rev["observations"]
        assert all(o["lineage"].get("lineage_present") for o in rev["observations"])
        assert rev["snapshot"].get("fabricated") is False

        monthly = client.post(
            "/api/v1/candidates/me/strategy-reviews/sessions",
            json={"cadence": "monthly"},
        )
        assert monthly.status_code == 201
        rid2 = monthly.json()["review"]["id"]

        fin = client.post(f"/api/v1/candidates/me/strategy-reviews/sessions/{rid}/finalize")
        assert fin.status_code == 200
        assert fin.json()["review"]["immutable"] is True

        cmp_ = client.post(
            "/api/v1/candidates/me/strategy-reviews/compare",
            json={"left_id": rid, "right_id": rid2},
        )
        assert cmp_.status_code == 200
        assert cmp_.json()["claim_kind"] == "FACT"

        asm = client.post(
            "/api/v1/candidates/me/strategy-reviews/assumptions",
            json={"statement": "Outreach channel X yields replies"},
        )
        assert asm.status_code == 201
        aid = asm.json()["assumption"]["id"]
        ev = client.post(
            f"/api/v1/candidates/me/strategy-reviews/assumptions/{aid}/evaluate",
            json={"result": "inconclusive"},
        )
        assert ev.status_code == 200
        assert ev.json()["assumption"]["evaluation"]["causality_claim"] is False

        dec = client.post(
            "/api/v1/candidates/me/strategy-reviews/decisions",
            json={
                "question": "Should I tilt ranking toward outcome weight?",
                "review_id": rid,
                "rationale": "Observed funnel",
                "supporting": [{"ref": "funnel"}],
                "contradicting": [],
                "unknowns": [{"code": "INSUFFICIENT_DATA"}],
                "alternatives": [
                    {"id": "keep", "label": "Keep"},
                    {"id": "tilt_outcome", "label": "Tilt outcome"},
                ],
                "counterfactuals": [
                    {
                        "id": "cf1",
                        "if": "keep",
                        "then": "unchanged",
                        "mutates_state": False,
                        "simulation_only": True,
                    }
                ],
            },
        )
        assert dec.status_code == 201, dec.text
        did = dec.json()["decision"]["id"]
        d0 = dec.json()["decision"]
        assert d0["requires_approval"] is True
        assert d0["silent"] is False
        assert d0["alternatives"]
        assert d0["alternatives"][0]["impact_preview"]["mutates_state_on_preview"] is False
        assert d0["counterfactuals"][0]["simulation_only"] is True
        assert d0["counterfactuals"][0]["mutates_state"] is False

        # Reject path — no ranking mutation
        prop = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/propose",
            json={"chosen_alternative_id": "tilt_outcome"},
        )
        assert prop.status_code == 200, prop.text
        assert prop.json()["requires_approval"] is True
        assert prop.json()["silent"] is False

        rej = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/resolve",
            json={"action": "reject"},
        )
        assert rej.status_code == 200
        assert rej.json()["ranking_changed"] is False
        assert rej.json()["state_mutated"] is False
        assert rej.json()["decision"]["status"] == "rejected"

        # Postpone path
        dec2 = client.post(
            "/api/v1/candidates/me/strategy-reviews/decisions",
            json={
                "question": "Postpone case",
                "alternatives": [{"id": "keep", "label": "Keep"}, {"id": "tilt_outcome", "label": "Tilt"}],
            },
        )
        did2 = dec2.json()["decision"]["id"]
        client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/propose",
            json={"chosen_alternative_id": "tilt_outcome"},
        )
        post = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/resolve",
            json={"action": "postpone"},
        )
        assert post.status_code == 200
        assert post.json()["ranking_changed"] is False
        assert post.json()["state_mutated"] is False

        # Approve + revert
        dec3 = client.post(
            "/api/v1/candidates/me/strategy-reviews/decisions",
            json={
                "question": "Approve case",
                "alternatives": [{"id": "keep", "label": "Keep"}, {"id": "tilt_outcome", "label": "Tilt"}],
            },
        )
        did3 = dec3.json()["decision"]["id"]
        client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/propose",
            json={"chosen_alternative_id": "tilt_outcome"},
        )
        apr = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/resolve",
            json={"action": "approve"},
        )
        assert apr.status_code == 200, apr.text
        assert apr.json()["ranking_changed"] is True
        assert apr.json()["decision"]["status"] == "approved_executed"

        fu = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/followups",
            json={"kind": "observe", "body": {"note": "ok"}},
        )
        assert fu.status_code == 201

        rc = client.post(f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/reconfirm")
        assert rc.status_code == 200

        rv = client.post(f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/revert")
        assert rv.status_code == 200
        assert rv.json()["ranking_restored"] is True
        assert rv.json()["silent"] is False

        # Stale decision cannot execute
        dec4 = client.post(
            "/api/v1/candidates/me/strategy-reviews/decisions",
            json={
                "question": "Stale case",
                "alternatives": [{"id": "tilt_outcome", "label": "Tilt"}],
            },
        )
        did4 = dec4.json()["decision"]["id"]
        client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did4}/propose",
            json={"chosen_alternative_id": "tilt_outcome"},
        )
        inv = client.post("/api/v1/candidates/me/strategy-reviews/invalidate-evidence")
        assert inv.status_code == 200
        assert inv.json()["stale_guard"] is True
        stale_exec = client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did4}/resolve",
            json={"action": "approve"},
        )
        assert stale_exec.status_code == 400

        # Archive stops spawn
        arch = client.post(f"/api/v1/candidates/me/strategy-reviews/sessions/{rid2}/archive")
        assert arch.status_code == 200
        assert arch.json()["review"]["spawns_tasks"] is False

        export = client.get("/api/v1/candidates/me/strategy-reviews/export")
        assert export.status_code == 200
        assert export.json()["secrets_excluded"] is True
        assert export.json()["interview_transcripts_excluded"] is True

        deleted = client.post("/api/v1/candidates/me/strategy-reviews/delete-history")
        assert deleted.status_code == 200
        assert deleted.json()["propagated"] is True

        daily = client.get("/api/v1/candidates/me/career-copilot/daily")
        assert daily.status_code == 200, daily.text
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()


def test_reject_and_postpone_do_not_create_weights(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        before = (
            db.query(CandidateRecommendationWeights)
            .filter_by(candidate_id=cand.id)
            .count()
        )
        dec = client.post(
            "/api/v1/candidates/me/strategy-reviews/decisions",
            json={
                "question": "No mutate",
                "alternatives": [{"id": "tilt_outcome", "label": "Tilt"}],
            },
        )
        did = dec.json()["decision"]["id"]
        client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/propose",
            json={"chosen_alternative_id": "tilt_outcome"},
        )
        client.post(
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/resolve",
            json={"action": "reject"},
        )
        after = (
            db.query(CandidateRecommendationWeights)
            .filter_by(candidate_id=cand.id)
            .count()
        )
        assert after == before
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()
