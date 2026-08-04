"""Epic 2.3 — Search Outcome Intelligence: funnel, attribution, calibration."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    CandidateNormalizedOpportunity,
    CandidateOpportunityWatchlist,
    CandidateOpportunityWatchlistHit,
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
    Job,
    OpportunitySource,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "search-outcome-intel-test-secret-32!")
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
        CandidateOpportunityWatchlist.__table__,
        CandidateOpportunityWatchlistHit.__table__,
        CandidateSavedSearch.__table__,
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
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="searchout@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Outcome Tester",
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
        email="searchout@example.com"
    ).one()
    return db, cand, TestClient(app), app, get_settings


def test_search_outcome_intelligence_flow(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/search-outcomes")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "119_search_outcome_intelligence"
        assert body["schema"] == "twin.search_outcome_intelligence/v1"
        assert body["safety"]["fabricated_benchmarks"] is False
        assert body["safety"]["silent_weight_change"] is False
        assert body["safety"]["feedback_as_offer"] is False
        assert body["safety"]["daily_os_404"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["routes"]["daily_os_canonical"] == "/api/v1/candidates/me/career-copilot/daily"
        assert body["funnel"]["benchmark"]["fabricated"] is False
        assert body["funnel"]["denominators"]["hidden_denominators"] is False

        tax = client.get("/api/v1/candidates/me/search-outcomes/taxonomy")
        assert tax.status_code == 200
        assert tax.json()["rules"]["no_silent_stage_upgrade"] is True
        assert tax.json()["rules"]["rejection_from_delay_inference"] is False

        ln = client.post(
            "/api/v1/candidates/me/search-outcomes/linkages",
            json={"stage": "OPPORTUNITY_SEEN", "provenance": "CANDIDATE_DECLARED"},
        )
        assert ln.status_code == 201, ln.text
        lid = ln.json()["linkage"]["id"]

        bad_fb_offer = client.post(
            "/api/v1/candidates/me/search-outcomes/events",
            json={
                "linkage_id": lid,
                "to_stage": "OFFER_DECLARED",
                "payload": {"is_feedback": True},
            },
        )
        assert bad_fb_offer.status_code == 400

        bad_pkg = client.post(
            "/api/v1/candidates/me/search-outcomes/events",
            json={
                "linkage_id": lid,
                "to_stage": "APPLICATION_DECLARED",
                "payload": {"package_approved": True},
            },
        )
        assert bad_pkg.status_code == 400

        bad_ext = client.post(
            "/api/v1/candidates/me/search-outcomes/events",
            json={
                "linkage_id": lid,
                "to_stage": "APPLICATION_DECLARED",
                "provenance": "EXTERNAL_CONFIRMED",
                "payload": {},
            },
        )
        assert bad_ext.status_code == 400

        ev = client.post(
            "/api/v1/candidates/me/search-outcomes/events",
            json={
                "linkage_id": lid,
                "to_stage": "APPLICATION_DECLARED",
                "provenance": "CANDIDATE_DECLARED",
            },
        )
        assert ev.status_code == 201
        assert ev.json()["event"]["silent_upgrade"] is False

        funnel = client.post("/api/v1/candidates/me/search-outcomes/funnel/refresh")
        assert funnel.status_code == 200
        assert funnel.json()["funnel"]["benchmark"]["fabricated"] is False
        assert funnel.json()["funnel"]["denominators"]["disclosed"] is True

        comps = client.get("/api/v1/candidates/me/search-outcomes/components")
        assert comps.status_code == 200
        assert comps.json()["causality_claims"] is False
        assert comps.json()["skill_mastery_inference"] is False

        attr = client.post("/api/v1/candidates/me/search-outcomes/attribution")
        assert attr.status_code == 200
        assert attr.json()["causality_claim"] is False

        fb = client.post(
            "/api/v1/candidates/me/search-outcomes/feedback",
            json={"kind": "usefulness", "body": {"helpful": True}},
        )
        assert fb.status_code == 201
        assert fb.json()["feedback"]["is_offer"] is False

        bad_offer_fb = client.post(
            "/api/v1/candidates/me/search-outcomes/feedback",
            json={"kind": "offer", "body": {}},
        )
        assert bad_offer_fb.status_code == 400

        weekly = client.post(
            "/api/v1/candidates/me/search-outcomes/reviews",
            json={"cadence": "weekly"},
        )
        assert weekly.status_code == 201
        monthly = client.post(
            "/api/v1/candidates/me/search-outcomes/reviews",
            json={"cadence": "monthly"},
        )
        assert monthly.status_code == 201

        cal = client.post(
            "/api/v1/candidates/me/search-outcomes/calibrations",
            json={"rationale": "Funnel observation"},
        )
        assert cal.status_code == 201, cal.text
        cid = cal.json()["calibration"]["id"]
        assert cal.json()["calibration"]["silent"] is False
        assert cal.json()["calibration"]["status"] == "pending"

        prev = client.get(f"/api/v1/candidates/me/search-outcomes/calibrations/{cid}/preview")
        assert prev.status_code == 200
        assert prev.json()["silent"] is False
        assert prev.json()["applied"] is False

        # Reject must not change ranking weights application
        rej = client.post(
            f"/api/v1/candidates/me/search-outcomes/calibrations/{cid}/resolve",
            json={"approved": False},
        )
        assert rej.status_code == 200
        assert rej.json()["calibration"]["status"] == "rejected"
        assert rej.json()["calibration"]["impact"]["ranking_changed"] is False

        cal2 = client.post(
            "/api/v1/candidates/me/search-outcomes/calibrations",
            json={"rationale": "Approve path"},
        )
        cid2 = cal2.json()["calibration"]["id"]
        apr = client.post(
            f"/api/v1/candidates/me/search-outcomes/calibrations/{cid2}/resolve",
            json={"approved": True},
        )
        assert apr.status_code == 200
        assert apr.json()["calibration"]["status"] == "approved"
        assert apr.json()["calibration"]["impact"]["ranking_changed"] is True
        assert apr.json()["calibration"]["silent"] is False

        rev = client.post(f"/api/v1/candidates/me/search-outcomes/calibrations/{cid2}/revert")
        assert rev.status_code == 200
        assert rev.json()["calibration"]["status"] == "reverted"

        inv = client.post("/api/v1/candidates/me/search-outcomes/invalidate-evidence")
        assert inv.status_code == 200
        assert inv.json()["stale_guard"] is True

        export = client.get("/api/v1/candidates/me/search-outcomes/export")
        assert export.status_code == 200
        assert export.json()["secrets_excluded"] is True
        assert export.json()["interview_transcripts_excluded"] is True

        deleted = client.post("/api/v1/candidates/me/search-outcomes/history/delete")
        assert deleted.status_code == 200
        assert deleted.json()["propagated"] is True

        daily = client.get("/api/v1/candidates/me/career-copilot/daily")
        assert daily.status_code == 200, daily.text
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()
