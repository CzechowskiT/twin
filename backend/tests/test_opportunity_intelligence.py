"""Epic 2.1 — Opportunity intelligence: ingest, market, fit, watch, studio handoff."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateAppStudioWorkspace,
    CandidateAppStudioPrivacy,
    CandidateAppStudioAudit,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateDiscoveryPrefs,
    CandidateNormalizedOpportunity,
    CandidateOpportunityAudit,
    CandidateOpportunityComparison,
    CandidateOpportunityWatchlist,
    CandidateOpportunityWatchlistHit,
    CandidateSavedSearch,
    Job,
    MarketSignalSnapshot,
    OpportunityIngestionAudit,
    OpportunityRefreshJob,
    OpportunitySource,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "opportunity-intel-test-secret-32chars!")
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
        CandidateOpportunityComparison.__table__,
        CandidateDiscoveryPrefs.__table__,
        MarketSignalSnapshot.__table__,
        OpportunityRefreshJob.__table__,
        OpportunityIngestionAudit.__table__,
        CandidateOpportunityAudit.__table__,
        CandidateCareerEvidence.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateAppStudioWorkspace.__table__,
        CandidateAppStudioPrivacy.__table__,
        CandidateAppStudioAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="oppintel@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Opp Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer Python FastAPI",
    )
    db.add(cand)
    db.flush()
    job = Job(
        job_board="pracuj",
        external_id="ext-1",
        title="Python Engineer",
        company="SynthCo",
        location="Warsaw",
        salary_min=15000,
        salary_max=20000,
        description="Must have Python\nNice FastAPI\nCollaborate with team",
        url="https://example.com/jobs/1",
        is_validated=True,
        scraped_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
        email="oppintel@example.com"
    ).one()
    return db, cand, job, TestClient(app), app, get_settings


def test_opportunity_intelligence_flow(monkeypatch):
    db, cand, job, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/opportunity-intelligence")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "117_opportunity_market_intelligence"
        assert body["schema"] == "twin.opportunity_market_intelligence/v1"
        assert body["safety"]["fabricated_activity"] is False
        assert body["safety"]["external_apply"] is False
        assert body["safety"]["prohibited_scraping"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["market"]["fabricated"] is False
        assert body["market"]["wording"] == "observed_source"
        assert body["market"]["metrics"]["demand_trend"] == "UNKNOWN"

        bad = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/ingest/paste",
            json={
                "title": "X",
                "company": "Y",
                "description": "<script>alert(1)</script>",
                "url": "http://127.0.0.1/secret",
            },
        )
        assert bad.status_code == 400

        paste = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/ingest/paste",
            json={
                "title": "Backend Engineer",
                "company": "PasteCo",
                "description": "Must have Python\nBuild APIs",
            },
        )
        assert paste.status_code == 201, paste.text
        opp = paste.json()["opportunity"]
        assert opp["salary"]["claim_kind"] in ("UNKNOWN", "CANDIDATE_RECOLLECTION")
        assert opp["salary"]["fabricated"] is False
        assert opp["fit"]["strong_fit_without_evidence"] is False
        oid = opp["id"]

        from_job = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/ingest/job",
            json={"job_id": job.id},
        )
        assert from_job.status_code == 201
        assert from_job.json()["opportunity"]["salary"]["fabricated"] is False
        assert from_job.json()["opportunity"]["salary"]["claim_kind"] == "SOURCE_SUPPORTED"

        wl = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/watchlists",
            json={"title": "Python", "query": {"title_contains": "Python"}},
        )
        assert wl.status_code == 201
        wid = wl.json()["watchlist"]["id"]
        refresh_wl = client.post(
            f"/api/v1/candidates/me/opportunity-intelligence/watchlists/{wid}/refresh"
        )
        assert refresh_wl.status_code == 200

        ss = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/saved-searches",
            json={"title": "Backend", "query": {"q": "Python"}, "notify": False},
        )
        assert ss.status_code == 201

        cmp = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/compare",
            json={"opportunity_ids": [oid]},
        )
        assert cmp.status_code == 200

        handoff = client.post(
            f"/api/v1/candidates/me/opportunity-intelligence/{oid}/studio-handoff"
        )
        assert handoff.status_code == 200
        assert handoff.json()["external_apply"] is False
        assert "stale_warning" in handoff.json()

        push = client.post(
            f"/api/v1/candidates/me/opportunity-intelligence/{oid}/push-daily-os"
        )
        assert push.status_code == 200
        assert push.json()["silent"] is False

        r1 = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/refresh",
            json={"idempotency_key": "idem-oi-1"},
        )
        assert r1.status_code == 200
        assert r1.json()["idempotent_hit"] is False
        r2 = client.post(
            "/api/v1/candidates/me/opportunity-intelligence/refresh",
            json={"idempotency_key": "idem-oi-1"},
        )
        assert r2.status_code == 200
        assert r2.json()["idempotent_hit"] is True

        inv = client.post("/api/v1/candidates/me/opportunity-intelligence/invalidate-fit")
        assert inv.status_code == 200
        assert inv.json()["strong_fit_without_evidence"] is False

        exp = client.get("/api/v1/candidates/me/opportunity-intelligence/export")
        assert exp.status_code == 200
        assert exp.json()["restricted_jd_excluded"] is True

        deleted = client.post("/api/v1/candidates/me/opportunity-intelligence/history/delete")
        assert deleted.status_code == 200
        assert deleted.json()["propagated"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
