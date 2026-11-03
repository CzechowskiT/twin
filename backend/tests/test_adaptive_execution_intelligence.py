"""Epic 2.7 — Adaptive Execution Intelligence."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAdaptiveExecutionAudit,
    CandidateCapacityCalibration,
    CandidateCapacityProfile,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateCommitmentQualityAnalysis,
    CandidateEstimateCalibration,
    CandidateEstimateComparison,
    CandidateEstimateSnapshot,
    CandidateEstimationProfile,
    CandidateExecutionObservation,
    CandidateExecutionPolicy,
    CandidateExecutionSimulation,
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
    monkeypatch.setenv("SECRET_KEY", "adaptive-execution-intel-test-secret-32!!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateCapacityProfile.__table__,
        CandidateCommitmentBatch.__table__,
        CandidateCommitmentBatchItem.__table__,
        CandidateLifecycleContext.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateLifecycleEvent.__table__,
        CandidateExecutionObservation.__table__,
        CandidateEstimateSnapshot.__table__,
        CandidateEstimateComparison.__table__,
        CandidateEstimationProfile.__table__,
        CandidateEstimateCalibration.__table__,
        CandidateCommitmentQualityAnalysis.__table__,
        CandidateCapacityCalibration.__table__,
        CandidateExecutionPolicy.__table__,
        CandidateExecutionSimulation.__table__,
        CandidateAdaptiveExecutionAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="aei@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="AEI Tester",
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


def test_adaptive_execution_intelligence_flow(monkeypatch):
    client, db, cand = _setup(monkeypatch)

    agg = client.get("/api/v1/candidates/me/execution-intelligence")
    assert agg.status_code == 200, agg.text
    body = agg.json()
    assert body["alembic"] == "123_adaptive_execution_intelligence"
    assert body["schema"] == "twin.adaptive_execution_intelligence/v1"
    assert body["safety"]["inferred_actual_effort"] is False
    assert body["safety"]["productivity_score"] is False
    assert body["safety"]["silent_estimate_change"] is False
    assert body["safety"]["silent_capacity_change"] is False
    assert body["safety"]["historic_batches_rewritten"] is False
    assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"

    # Capacity profile for capacity calibration
    db.add(
        CandidateCapacityProfile(
            candidate_id=cand.id,
            profile_key="default",
            weekly_budget_minutes=120,
            timezone_name="UTC",
            windows_json="[]",
            protected_focus_json='{"enabled":false}',
            explicit_budget_only=True,
            inferred_obligations=False,
            claim_kind="CANDIDATE_CONFIRMED",
            kpi_excluded=True,
            updated_at=datetime.utcnow(),
        )
    )
    batch = CandidateCommitmentBatch(
        candidate_id=cand.id,
        batch_key="batch:aei",
        status="approved_executed",
        version=1,
        feasibility_json="{}",
        alternatives_json="[]",
        external_created=False,
        kpi_excluded=True,
        created_at=datetime.utcnow(),
    )
    db.add(batch)
    db.flush()
    start = datetime.utcnow() + timedelta(days=1)
    item = CandidateCommitmentBatchItem(
        candidate_id=cand.id,
        item_key="cbi:aei",
        batch_id=batch.id,
        status="completed",
        title="Internal hold",
        starts_at=start,
        ends_at=start + timedelta(hours=1),
        effort_minutes=60,
        is_hold=True,
        external_created=False,
        progress_json="{}",
        kpi_excluded=True,
        created_at=datetime.utcnow(),
    )
    db.add(item)
    db.commit()

    # Snapshot + compare via progress hook path (service)
    from app.services import adaptive_execution_intelligence as aei

    snaps = aei.snapshot_estimates_for_batch(db, candidate_id=cand.id, batch_id=batch.id)
    assert snaps
    cmp = aei.compare_estimate_vs_actual(
        db, candidate_id=cand.id, item_id=item.id, actual_minutes=90
    )
    assert cmp["actual_minutes"] == 90
    assert cmp["estimated_minutes"] == 60
    assert (cmp["ratio"] or {}).get("inferred_actual") is False
    assert (cmp["ratio"] or {}).get("productivity_score") is None

    prop = client.post("/api/v1/candidates/me/execution-intelligence/estimates/calibrate")
    assert prop.status_code == 201, prop.text
    assert prop.json()["silent"] is False
    assert prop.json()["requires_approval"] is True
    cid = prop.json()["calibration"]["id"]

    rej = client.post(
        f"/api/v1/candidates/me/execution-intelligence/estimates/calibrations/{cid}/resolve",
        json={"action": "reject"},
    )
    assert rej.status_code == 200
    assert rej.json()["profile_mutated"] is False
    assert rej.json()["historic_batches_rewritten"] is False

    prop2 = client.post("/api/v1/candidates/me/execution-intelligence/estimates/calibrate")
    cid2 = prop2.json()["calibration"]["id"]
    appr = client.post(
        f"/api/v1/candidates/me/execution-intelligence/estimates/calibrations/{cid2}/resolve",
        json={"action": "approve"},
    )
    assert appr.status_code == 200
    assert appr.json()["profile_mutated"] is True
    assert appr.json()["historic_batches_rewritten"] is False
    assert appr.json()["silent"] is False

    qual = client.post(
        "/api/v1/candidates/me/execution-intelligence/quality/analyze", json={}
    )
    assert qual.status_code == 201
    assert qual.json()["analyses"]
    assert all(a["body"].get("productivity_score") is None for a in qual.json()["analyses"])

    cap = client.post("/api/v1/candidates/me/execution-intelligence/capacity/calibrate")
    assert cap.status_code == 201, cap.text
    assert cap.json()["silent"] is False
    ccid = cap.json()["calibration"]["id"]
    cap_rej = client.post(
        f"/api/v1/candidates/me/execution-intelligence/capacity/calibrations/{ccid}/resolve",
        json={"action": "reject"},
    )
    assert cap_rej.status_code == 200
    assert cap_rej.json()["capacity_mutated"] is False

    pol = client.post(
        "/api/v1/candidates/me/execution-intelligence/policies",
        json={"body": {"max_holds_per_week": 3}},
    )
    assert pol.status_code == 201
    pid = pol.json()["policy"]["id"]
    sim = client.post(f"/api/v1/candidates/me/execution-intelligence/policies/{pid}/simulate")
    assert sim.status_code == 201
    assert sim.json()["mutates_state"] is False

    health = client.get("/api/v1/candidates/me/execution-intelligence/health")
    assert health.status_code == 200
    assert health.json()["productivity_score"] is None

    exp = client.get("/api/v1/candidates/me/execution-intelligence/export")
    assert exp.status_code == 200
    assert exp.json()["productivity_score_excluded"] is True

    deleted = client.post("/api/v1/candidates/me/execution-intelligence/delete-history")
    assert deleted.status_code == 200
    assert deleted.json()["propagated"] is True
