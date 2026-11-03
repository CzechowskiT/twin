"""Epic 2.0 — Outcome-calibrated strategy + candidate-controlled internal execution."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateAppStudioWorkspace,
    CandidateCalibrationProposal,
    CandidateCareerEvidence,
    CandidateCareerInboxItem,
    CandidateCareerOutcome,
    CandidateDeletionJob,
    CandidateExecutionPlan,
    CandidateExecutionStep,
    CandidateInterviewProcess,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    CandidatePrivacyRevocationJob,
    CandidateRankingSnapshot,
    CandidateRecommendationWeights,
    CandidateStrategyAudit,
    CandidateStrategyProfile,
    CandidateTransitionCalibration,
    CandidateTransitionWorkspace,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "career-strategy-test-secret-32chars!!")
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
        CandidateLifecycleEvent.__table__,
        CandidateLifecycleHandoff.__table__,
        CandidateLifecycleFinding.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateRecommendationWeights.__table__,
        CandidateCareerEvidence.__table__,
        CandidateAppStudioWorkspace.__table__,
        CandidateInterviewProcess.__table__,
        CandidateTransitionWorkspace.__table__,
        CandidateTransitionCalibration.__table__,
        CandidateCareerOutcome.__table__,
        CandidateStrategyProfile.__table__,
        CandidateRankingSnapshot.__table__,
        CandidateCalibrationProposal.__table__,
        CandidateExecutionPlan.__table__,
        CandidateExecutionStep.__table__,
        CandidateDeletionJob.__table__,
        CandidatePrivacyRevocationJob.__table__,
        CandidateStrategyAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="strategy@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Strategy Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer",
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
        email="strategy@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def test_strategy_ranking_calibration_plan_deletion(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/career-strategy")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "116_outcome_calibrated_execution"
        assert body["schema"] == "twin.outcome_calibrated_execution/v1"
        assert body["safety"]["silent_calibration"] is False
        assert body["safety"]["external_execution"] is False
        assert body["safety"]["daily_os_separate_ranking"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["ranking"]["canonical"] is True
        assert "counterfactuals" in body["ranking"]
        assert "attribution" in body["ranking"]

        refresh = client.post("/api/v1/candidates/me/career-strategy/ranking/refresh")
        assert refresh.status_code == 201
        assert refresh.json()["daily_os"]["canonical_ranking"] is True
        assert refresh.json()["daily_os"]["separate_ranking"] is False

        fb = client.post(
            "/api/v1/candidates/me/career-strategy/feedback",
            json={"feedback": "helpful", "ranking_snapshot_id": body["ranking"]["id"]},
        )
        assert fb.status_code == 200
        assert fb.json()["immediate_weight_update"] is False

        prop = client.post("/api/v1/candidates/me/career-strategy/calibration/propose", json={})
        assert prop.status_code == 201
        proposal = prop.json()["proposal"]
        assert proposal["status"] == "pending"
        assert proposal["bundled"] is False
        assert proposal["explain"]["silent"] is False
        pid = proposal["id"]

        rej = client.post(
            f"/api/v1/candidates/me/career-strategy/calibration/{pid}/resolve",
            json={"approved": False},
        )
        assert rej.status_code == 200
        assert rej.json()["proposal"]["status"] == "rejected"

        prop2 = client.post("/api/v1/candidates/me/career-strategy/calibration/propose", json={})
        assert prop2.status_code == 201
        pid2 = prop2.json()["proposal"]["id"]
        before_ver = client.get("/api/v1/candidates/me/career-strategy").json()["ranking"][
            "weights_version"
        ]
        ok = client.post(
            f"/api/v1/candidates/me/career-strategy/calibration/{pid2}/resolve",
            json={"approved": True},
        )
        assert ok.status_code == 200
        assert ok.json()["proposal"]["status"] == "approved"
        after = client.get("/api/v1/candidates/me/career-strategy").json()
        assert after["ranking"]["weights_version"] >= before_ver

        rev = client.post(f"/api/v1/candidates/me/career-strategy/calibration/{pid2}/revert")
        assert rev.status_code == 200
        assert rev.json()["proposal"]["status"] == "reverted"

        plan = client.post(
            "/api/v1/candidates/me/career-strategy/plans",
            json={"title": "Internal plan", "idempotency_key": "idem-1"},
        )
        assert plan.status_code == 201
        assert plan.json()["idempotent_hit"] is False
        plan_id = plan.json()["plan"]["id"]
        assert plan.json()["plan"]["external_actions"] is False
        assert all(not s.get("external") for s in plan.json()["plan"]["steps"])

        dup = client.post(
            "/api/v1/candidates/me/career-strategy/plans",
            json={"title": "Internal plan", "idempotency_key": "idem-1"},
        )
        assert dup.status_code == 201
        assert dup.json()["idempotent_hit"] is True
        assert dup.json()["plan"]["id"] == plan_id

        run = client.post(f"/api/v1/candidates/me/career-strategy/plans/{plan_id}/run")
        assert run.status_code == 200
        assert run.json()["plan"]["status"] in ("completed", "running")

        plan2 = client.post(
            "/api/v1/candidates/me/career-strategy/plans",
            json={"title": "Pause plan", "idempotency_key": "idem-pause"},
        )
        p2 = plan2.json()["plan"]["id"]
        pause = client.post(
            f"/api/v1/candidates/me/career-strategy/plans/{p2}/control",
            json={"action": "pause"},
        )
        assert pause.status_code == 200
        assert pause.json()["paused"] is True
        blocked = client.post(f"/api/v1/candidates/me/career-strategy/plans/{p2}/run")
        assert blocked.status_code == 400

        resume = client.post(
            f"/api/v1/candidates/me/career-strategy/plans/{p2}/control",
            json={"action": "resume"},
        )
        assert resume.status_code == 200

        sim = client.post("/api/v1/candidates/me/career-strategy/simulate")
        assert sim.status_code == 200
        assert "simulation" in sim.json()

        life = client.get("/api/v1/candidates/me/career-lifecycle")
        assert life.status_code == 200
        nba = life.json().get("nba") or {}
        assert nba.get("separate_ranking") is False

        preview = client.post(
            "/api/v1/candidates/me/career-strategy/deletion/run",
            json={"preview_only": True},
        )
        assert preview.status_code == 200
        assert preview.json()["job"]["preview_only"] is True
        assert preview.json()["job"]["status"] == "previewed"

        exe = client.post(
            "/api/v1/candidates/me/career-strategy/deletion/run",
            json={"preview_only": False},
        )
        assert exe.status_code == 200
        assert exe.json()["job"]["preview_only"] is False
        assert exe.json()["job"]["status"] == "completed"

        # Privacy revoke still executes after deletion soft-cleared strategy
        priv = client.post(
            "/api/v1/candidates/me/career-strategy/privacy/revoke",
            json={"scopes": ["orchestration", "search"]},
        )
        assert priv.status_code == 200
        assert priv.json()["job"]["executed"] is True
        assert priv.json()["job"]["status"] == "completed"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_strategy_external_plan_forbidden(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        plan = CandidateExecutionPlan(
            candidate_id=cand.id,
            plan_key="plan:ext",
            title="bad",
            status="draft",
            external_actions=True,
            idempotency_key="ext-1",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(plan)
        db.commit()
        res = client.post(f"/api/v1/candidates/me/career-strategy/plans/{plan.id}/run")
        assert res.status_code == 400
        assert "external" in (res.json().get("detail") or "").lower()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
