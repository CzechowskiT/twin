"""Epic 2.2 — Search Strategy Lab / Career Market Radar."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateGapObservation,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    CandidateNormalizedOpportunity,
    CandidateOpportunityWatchlist,
    CandidatePortfolioHealthSnapshot,
    CandidateRoleThesis,
    CandidateSavedSearch,
    CandidateSearchCycle,
    CandidateSearchExperiment,
    CandidateSearchPortfolio,
    CandidateSearchStrategy,
    CandidateSearchStrategyAudit,
    CandidateSourceCoverageSnapshot,
    CandidateStrategyReview,
    Job,
    MarketSignalSnapshot,
    OpportunitySource,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "search-strategy-lab-test-secret-32c!")
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
        MarketSignalSnapshot.__table__,
        CandidateNormalizedOpportunity.__table__,
        CandidateOpportunityWatchlist.__table__,
        CandidateSavedSearch.__table__,
        CandidateCareerEvidence.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateAcceptanceItem.__table__,
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
        CandidateGapObservation.__table__,
        CandidateSourceCoverageSnapshot.__table__,
        CandidatePortfolioHealthSnapshot.__table__,
        CandidateStrategyReview.__table__,
        CandidateSearchStrategyAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="searchlab@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Search Lab Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer Python FastAPI",
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
        email="searchlab@example.com"
    ).one()
    return db, cand, TestClient(app), app, get_settings


def test_search_strategy_lab_flow(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/search-strategy")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "118_career_market_radar_search_strategy"
        assert body["schema"] == "twin.career_market_radar_search_strategy/v1"
        assert body["safety"]["strategy_activation_without_approval"] is False
        assert body["safety"]["silent_weight_change"] is False
        assert body["safety"]["whole_market_claims"] is False
        assert body["safety"]["fabricated_conversion"] is False
        assert body["safety"]["keyword_only_gaps"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["coverage"]["whole_market_claim"] is False
        assert body["coverage"]["wording"] == "observed_source"

        created = client.post(
            "/api/v1/candidates/me/search-strategy",
            json={"title": "Platform search", "target_role": "Platform Engineer"},
        )
        assert created.status_code == 201, created.text
        strategy = created.json()["strategy"]
        sid = strategy["id"]
        assert strategy["status"] == "draft"
        assert strategy["silent_activation"] is False
        assert strategy["cycles"]
        assert strategy["cycles"][0]["spawns_tasks"] is True

        # Must not activate without approval
        bad = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/resolve-activate",
            json={"approved": True},
        )
        assert bad.status_code == 400

        prop = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/propose-activate")
        assert prop.status_code == 200, prop.text
        assert prop.json()["silent_activation"] is False
        assert prop.json()["requires_approval"] is True
        assert prop.json()["strategy"]["status"] == "pending_approval"

        act = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/resolve-activate",
            json={"approved": True},
        )
        assert act.status_code == 200, act.text
        assert act.json()["silent_activation"] is False
        assert act.json()["strategy"]["status"] == "active"

        thesis = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/thesis",
            json={"title": "Primary platform thesis", "body": {"family": "platform"}},
        )
        assert thesis.status_code == 201, thesis.text
        tid = thesis.json()["thesis"]["id"]
        assert thesis.json()["thesis"]["body"]["silent_thesis_change"] is False
        assert thesis.json()["thesis"]["body"]["hiring_probability"] is None

        st = client.post(
            f"/api/v1/candidates/me/search-strategy/theses/{tid}/status",
            json={"status": "PRIMARY"},
        )
        assert st.status_code == 200
        assert st.json()["thesis"]["status"] == "PRIMARY"

        cov = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/coverage")
        assert cov.status_code == 200
        assert cov.json()["coverage"]["whole_market_claim"] is False

        gaps = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/gaps")
        assert gaps.status_code == 200
        assert gaps.json()["keyword_only"] is False

        inv = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/gap-investment",
            json={},
        )
        assert inv.status_code == 200
        assert inv.json()["investment"]["auto_applied"] is False

        port = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/portfolio/refresh")
        assert port.status_code == 200
        assert port.json()["health"]["fabricated_conversion"] is False

        alloc = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/allocation",
            json={
                "allocations": [
                    {"bucket": "core_fit", "pct": 70},
                    {"bucket": "stretch", "pct": 30},
                ],
                "candidate_approved_concentration": True,
            },
        )
        assert alloc.status_code == 200
        assert alloc.json()["balance"]["state"] == "CONCENTRATED_BY_CANDIDATE_CHOICE"
        assert alloc.json()["silent"] is False

        sim = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/simulate")
        assert sim.status_code == 200
        assert sim.json()["simulation"]["fabricated_conversion"] is False
        assert sim.json()["simulation"]["hiring_probability"] is None

        exp = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/experiments",
            json={"hypothesis": "More stretch roles improve interviews"},
        )
        assert exp.status_code == 201
        eid = exp.json()["experiment"]["id"]
        assert exp.json()["experiment"]["silent_weight_change"] is False

        paused = client.post(f"/api/v1/candidates/me/search-strategy/experiments/{eid}/pause")
        assert paused.status_code == 200
        resumed = client.post(f"/api/v1/candidates/me/search-strategy/experiments/{eid}/resume")
        assert resumed.status_code == 200

        done = client.post(
            f"/api/v1/candidates/me/search-strategy/experiments/{eid}/complete",
            json={"observation": "No silent weight change"},
        )
        assert done.status_code == 200
        assert done.json()["experiment"]["result"]["weights_changed"] is False
        assert done.json()["experiment"]["silent_weight_change"] is False

        rev = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/reviews",
            json={"cadence": "weekly"},
        )
        assert rev.status_code == 201
        rid = rev.json()["review"]["id"]
        apr = client.post(
            f"/api/v1/candidates/me/search-strategy/reviews/{rid}/approve",
            json={"changes": [{"type": "ack"}]},
        )
        assert apr.status_code == 200

        monthly = client.post(
            f"/api/v1/candidates/me/search-strategy/{sid}/reviews",
            json={"cadence": "monthly"},
        )
        assert monthly.status_code == 201

        conflicts = client.get(f"/api/v1/candidates/me/search-strategy/{sid}/conflicts")
        assert conflicts.status_code == 200
        assert conflicts.json()["silent_resolution"] is False

        cycle_id = strategy["cycles"][0]["id"]
        pause_c = client.post(f"/api/v1/candidates/me/search-strategy/cycles/{cycle_id}/pause")
        assert pause_c.status_code == 200
        assert pause_c.json()["cycle"]["spawns_tasks"] is False
        resume_c = client.post(f"/api/v1/candidates/me/search-strategy/cycles/{cycle_id}/resume")
        assert resume_c.status_code == 200
        arch = client.post(f"/api/v1/candidates/me/search-strategy/cycles/{cycle_id}/archive")
        assert arch.status_code == 200
        assert arch.json()["cycle"]["spawns_tasks"] is False
        assert arch.json()["cycle"]["status"] == "archived"

        restart = client.post(f"/api/v1/candidates/me/search-strategy/{sid}/cycles/restart")
        assert restart.status_code == 200
        assert restart.json()["cycle"]["spawns_tasks"] is True

        inv_th = client.post("/api/v1/candidates/me/search-strategy/invalidate-theses")
        assert inv_th.status_code == 200
        assert inv_th.json()["stale_guard"] is True

        export = client.get("/api/v1/candidates/me/search-strategy/export")
        assert export.status_code == 200
        assert export.json()["secrets_excluded"] is True
        assert export.json()["opportunity_payloads_excluded"] is True

        deleted = client.post("/api/v1/candidates/me/search-strategy/history/delete")
        assert deleted.status_code == 200
        assert deleted.json()["propagated"] is True
    finally:
        get_settings.cache_clear()
        app.dependency_overrides.clear()
        db.close()
