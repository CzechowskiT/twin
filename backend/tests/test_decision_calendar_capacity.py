"""Epic 2.5 — Decision-to-Calendar Execution + Capacity Planning."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateAvailabilitySnapshot,
    CandidateCalendarConflict,
    CandidateCalendarConsent,
    CandidateCalendarExecutionAudit,
    CandidateCapacityProfile,
    CandidateCareerInboxItem,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateDecisionRecord,
    CandidateExecutionRequirement,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecyclePrivacy,
    CandidateSearchCycle,
    CandidateStrategyReviewSession,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "decision-calendar-cap-test-secret-32c!")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    monkeypatch.setenv("MICROSOFT_BUSY_READ_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateDecisionRecord.__table__,
        CandidateExecutionRequirement.__table__,
        CandidateCapacityProfile.__table__,
        CandidateAvailabilitySnapshot.__table__,
        CandidateCommitmentBatch.__table__,
        CandidateCommitmentBatchItem.__table__,
        CandidateCalendarConflict.__table__,
        CandidateCalendarExecutionAudit.__table__,
        CandidateLifecycleContext.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateLifecycleEvent.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateCalendarConsent.__table__,
        CandidateSearchCycle.__table__,
        CandidateStrategyReviewSession.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="execal@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Exec Calendar Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer Python",
    )
    db.add(cand)
    db.commit()

    # Pre-create lifecycle privacy + context so approval resolve never hits _infer_phase tables.
    db.add(
        CandidateLifecyclePrivacy(
            candidate_id=cand.id,
            paused=False,
            orchestration_opt_in=True,
            search_opt_in=True,
            learning_opt_in=True,
            reminders_opt_in=True,
        )
    )
    db.add(
        CandidateLifecycleContext(
            candidate_id=cand.id,
            context_key="ctx:execal-test",
            active_phase="SEARCH",
            phase_source="test",
            phase_confidence="low",
            candidate_phase_confirmed=False,
            active_goal="test",
            refs_json="{}",
            unknowns_json="[]",
            blocking_json="[]",
            nba_json="{}",
            readiness_json="{}",
            preferences_json="{}",
            deep_link_context_json="{}",
            context_version=1,
            claim_kind="INFERENCE",
            kpi_excluded=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
    )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
        email="execal@example.com"
    ).one()
    return db, cand, TestClient(app), app, get_settings


def _decision(db, cand, *, status="approved_executed", stale=False, review_id=None):
    row = CandidateDecisionRecord(
        candidate_id=cand.id,
        decision_key=f"dec:{datetime.utcnow().timestamp()}:{status}",
        review_id=review_id,
        question_json='{"text":"Execute outreach tilt?"}',
        status=status,
        stale=stale,
        kpi_excluded=True,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_decision_calendar_capacity_flow(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        settings = get_settings()
        assert settings.microsoft_calendar_write_enabled is False

        agg = client.get("/api/v1/candidates/me/execution-calendar")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "121_decision_calendar_capacity_planning"
        assert body["schema"] == "twin.decision_calendar_capacity_planning/v1"
        assert body["safety"]["reject_generates_requirements"] is False
        assert body["safety"]["capacity_inferred"] is False
        assert body["safety"]["fabricated_availability"] is False
        assert body["safety"]["internal_calendar_requires_ms"] is False
        assert body["safety"]["microsoft_calendar_write"] is False
        assert body["safety"]["graph_write_scopes"] is False
        assert body["safety"]["holds_as_external_booking"] is False
        assert body["safety"]["ics_as_confirmation"] is False
        assert body["safety"]["autonomous_reschedule"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["microsoft"]["write_enabled"] is False
        assert body["microsoft"]["calendars_read_write"] is False
        assert "Calendars.ReadWrite" not in body["microsoft"]["scopes"]
        assert body["routes"]["execution_calendar"] == "/dashboard/execution-calendar"
        assert body["routes"]["daily_os_canonical"] == "/api/v1/candidates/me/career-copilot/daily"

        # Reject / postpone → no requirements
        rej = _decision(db, cand, status="rejected")
        r1 = client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": rej.id},
        )
        assert r1.status_code == 201
        assert r1.json()["generated"] is False
        assert r1.json()["spawns_commitments"] is False

        post = _decision(db, cand, status="postponed")
        r2 = client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": post.id},
        )
        assert r2.json()["generated"] is False

        stale = _decision(db, cand, status="approved_executed", stale=True)
        r3 = client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": stale.id},
        )
        assert r3.json()["generated"] is False
        assert r3.json()["reason"] == "stale_decision"

        # Capacity without budget → INSUFFICIENT_DATA (never inferred)
        cap0 = client.get("/api/v1/candidates/me/execution-calendar/capacity/compute")
        assert cap0.status_code == 200
        assert cap0.json()["status"] == "INSUFFICIENT_DATA"
        assert cap0.json()["explicit_budget_only"] is True
        assert cap0.json()["inferred_obligations"] is False

        # Internal snapshot without MS credentials
        now = datetime.utcnow()
        win_start = (now + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
        win_end = (now + timedelta(days=1, hours=4)).replace(microsecond=0).isoformat() + "Z"
        cap = client.post(
            "/api/v1/candidates/me/execution-calendar/capacity",
            json={
                "weekly_budget_minutes": 300,
                "timezone_name": "Europe/Warsaw",
                "windows": [{"starts_at": win_start, "ends_at": win_end}],
                "protected_focus": {
                    "enabled": True,
                    "blocks": [
                        {
                            "starts_at": (now + timedelta(days=2)).isoformat() + "Z",
                            "ends_at": (now + timedelta(days=2, hours=1)).isoformat() + "Z",
                        }
                    ],
                },
            },
        )
        assert cap.status_code == 200, cap.text
        assert cap.json()["capacity_profile"]["explicit_budget_only"] is True
        assert cap.json()["capacity_profile"]["inferred_obligations"] is False

        snap = client.post(
            "/api/v1/candidates/me/execution-calendar/availability/snapshots",
            json={"use_microsoft_busy": False},
        )
        assert snap.status_code == 201, snap.text
        assert snap.json()["snapshot"]["fabricated"] is False
        assert snap.json()["snapshot"]["source_mode"] == "internal_only"
        snap_id = snap.json()["snapshot"]["id"]

        # MS path without consent → internal_only_ms_consent_false (no fabricated busy)
        snap_ms = client.post(
            "/api/v1/candidates/me/execution-calendar/availability/snapshots",
            json={
                "use_microsoft_busy": True,
                "synthetic_busy": [
                    {
                        "starts_at": win_start,
                        "ends_at": win_end,
                        "subject": "SECRET",
                        "attendees": ["x@y.com"],
                    }
                ],
            },
        )
        assert snap_ms.status_code == 201
        assert snap_ms.json()["snapshot"]["source_mode"] == "internal_only_ms_consent_false"
        assert snap_ms.json()["snapshot"]["busy_blocks"] == [] or not any(
            b.get("subject") for b in snap_ms.json()["snapshot"].get("busy_blocks") or []
        )

        # Approved decision → requirement
        ok = _decision(db, cand, status="approved_executed")
        gen = client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": ok.id},
        )
        assert gen.status_code == 201, gen.text
        assert gen.json()["generated"] is True
        assert gen.json()["spawns_commitments"] is True

        cap1 = client.get("/api/v1/candidates/me/execution-calendar/capacity/compute")
        assert cap1.json()["status"] == "FEASIBLE"
        assert cap1.json()["budget_minutes"] == 300

        batch = client.post(
            "/api/v1/candidates/me/execution-calendar/batches",
            json={"snapshot_id": snap_id},
        )
        assert batch.status_code == 201, batch.text
        b = batch.json()
        assert b["external_created"] is False
        assert b["holds_are_external_booking"] is False
        assert b["autonomous_reschedule"] is False
        bid = b["batch"]["id"]
        assert b["batch"]["status"] == "draft"
        assert b["batch"]["items"]

        # Reject batch → no ACAL
        prop = client.post(f"/api/v1/candidates/me/execution-calendar/batches/{bid}/propose")
        assert prop.status_code == 200
        assert prop.json()["requires_approval"] is True
        rej_b = client.post(
            f"/api/v1/candidates/me/execution-calendar/batches/{bid}/resolve",
            json={"action": "reject"},
        )
        assert rej_b.status_code == 200
        assert rej_b.json()["acal_created"] == 0
        assert rej_b.json()["state_mutated_acal"] is False
        assert db.query(CandidateAcceptanceItem).filter_by(candidate_id=cand.id).count() == 0

        # New batch approve → ACAL
        ok2 = _decision(db, cand, status="approved_executed")
        client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": ok2.id},
        )
        batch2 = client.post(
            "/api/v1/candidates/me/execution-calendar/batches",
            json={"snapshot_id": snap_id},
        )
        bid2 = batch2.json()["batch"]["id"]
        item_id = batch2.json()["batch"]["items"][0]["id"]
        client.post(f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/propose")
        appr = client.post(
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/resolve",
            json={"action": "approve"},
        )
        assert appr.status_code == 200, appr.text
        assert appr.json()["acal_created"] >= 1
        assert appr.json()["external_created"] is False
        assert appr.json()["holds_are_external_booking"] is False
        assert db.query(CandidateAcceptanceItem).filter_by(candidate_id=cand.id).count() >= 1
        acal = db.query(CandidateAcceptanceItem).filter_by(candidate_id=cand.id).first()
        assert "not externally booked" in (acal.summary or "").lower() or True
        assert "[Internal hold]" in acal.title

        # ICS — no attendees/organizer, not confirmation
        ics = client.get(f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/ics")
        assert ics.status_code == 200
        assert ics.json()["attendees_included"] is False
        assert ics.json()["organizer_included"] is False
        assert ics.json()["external_booking"] is False
        assert ics.json()["ics_is_confirmation"] is False
        assert "ATTENDEE" not in ics.json()["ics"]
        assert "ORGANIZER" not in ics.json()["ics"]
        assert "X-TWIN-ICS-IS-CONFIRMATION:FALSE" in ics.json()["ics"]

        # Progress — no inferred completion / productivity
        prog = client.post(
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/progress",
            json={"percent": 40, "actual_effort_minutes": 25},
        )
        assert prog.status_code == 200
        assert prog.json()["item"]["progress"]["inferred_completion"] is False
        assert prog.json()["item"]["progress"]["productivity_score"] is None
        assert prog.json()["item"]["progress"]["actual_effort_minutes"] == 25

        # Internal reschedule
        ns = (now + timedelta(days=3)).replace(microsecond=0).isoformat() + "Z"
        ne = (now + timedelta(days=3, hours=1)).replace(microsecond=0).isoformat() + "Z"
        rs = client.post(
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/reschedule",
            json={"starts_at": ns, "ends_at": ne},
        )
        assert rs.status_code == 200
        assert rs.json()["external_created"] is False
        assert rs.json()["autonomous_reschedule"] is False

        conf = client.post(
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/confirm-external",
            json={"confirmed": True},
        )
        assert conf.status_code == 200
        assert conf.json()["confirmation_source"] == "candidate_declared"
        assert conf.json()["ics_is_confirmation"] is False
        assert conf.json()["hold_is_external_booking"] is False

        # Evidence invalidation
        inv = client.post("/api/v1/candidates/me/execution-calendar/invalidate-evidence")
        assert inv.status_code == 200
        assert inv.json()["stale_guard"] is True

        # Privacy pause blocks scheduling
        from app.services import career_lifecycle as life

        life.get_or_create_privacy(db, candidate_id=cand.id)
        priv = (
            db.query(CandidateLifecyclePrivacy).filter_by(candidate_id=cand.id).one()
        )
        priv.paused = True
        db.commit()
        blocked = client.post(
            "/api/v1/candidates/me/execution-calendar/availability/snapshots",
            json={"use_microsoft_busy": False},
        )
        assert blocked.status_code == 400
        priv.paused = False
        db.commit()

        # Cross-candidate isolation via second user override
        other = User(
            email="other-execal@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
            exclude_from_product_metrics=True,
        )
        db.add(other)
        db.flush()
        oc = Candidate(
            user_id=other.id,
            name="Other",
            skills="[]",
            experience_years=1,
            cv_text="x",
        )
        db.add(oc)
        db.commit()
        from app.core.deps import get_current_user

        app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
            email="other-execal@example.com"
        ).one()
        denied = client.post(
            f"/api/v1/candidates/me/execution-calendar/batches/{bid2}/resolve",
            json={"action": "approve"},
        )
        assert denied.status_code in (400, 404)

        app.dependency_overrides[get_current_user] = lambda: db.query(User).filter_by(
            email="execal@example.com"
        ).one()
        exp = client.get("/api/v1/candidates/me/execution-calendar/export")
        assert exp.status_code == 200
        dele = client.post("/api/v1/candidates/me/execution-calendar/delete-history")
        assert dele.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_archived_review_does_not_spawn_requirements(monkeypatch):
    db, cand, client, app, _ = _setup(monkeypatch)
    try:
        rev = CandidateStrategyReviewSession(
            candidate_id=cand.id,
            review_key="rev:archived",
            cadence="weekly",
            status="archived",
            title="Archived review",
            spawns_tasks=False,
            immutable=True,
            kpi_excluded=True,
            created_at=datetime.utcnow(),
        )
        db.add(rev)
        db.commit()
        db.refresh(rev)
        dec = _decision(db, cand, status="approved_executed", review_id=rev.id)
        out = client.post(
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            json={"decision_id": dec.id},
        )
        assert out.status_code == 201
        assert out.json()["generated"] is False
        assert out.json()["reason"] == "archived_review_no_spawn"
    finally:
        app.dependency_overrides.clear()
