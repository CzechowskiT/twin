"""Epic 2.6 — Read-Only Calendar Sync + Consent Lifecycle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateAvailabilityBlock,
    CandidateAvailabilitySnapshot,
    CandidateCalendarBusyDelta,
    CandidateCalendarConsent,
    CandidateCalendarConnection,
    CandidateCalendarPrivateFeed,
    CandidateCalendarRecalculationProposal,
    CandidateCalendarSyncAudit,
    CandidateCalendarSyncRun,
    CandidateCareerInboxItem,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateExecutionRequirement,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecyclePrivacy,
    User,
    UserMicrosoftCalendar,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "read-only-calendar-sync-test-secret-32!")
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
        UserMicrosoftCalendar.__table__,
        CandidateCalendarConsent.__table__,
        CandidateAvailabilityBlock.__table__,
        CandidateAvailabilitySnapshot.__table__,
        CandidateExecutionRequirement.__table__,
        CandidateCommitmentBatch.__table__,
        CandidateCommitmentBatchItem.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateLifecycleContext.__table__,
        CandidateLifecycleApproval.__table__,
        CandidateLifecyclePrivacy.__table__,
        CandidateLifecycleAudit.__table__,
        CandidateLifecycleEvent.__table__,
        CandidateCalendarConnection.__table__,
        CandidateCalendarSyncRun.__table__,
        CandidateCalendarBusyDelta.__table__,
        CandidateCalendarRecalculationProposal.__table__,
        CandidateCalendarPrivateFeed.__table__,
        CandidateCalendarSyncAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="rocs@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="ROCS Tester",
        skills='["Python"]',
        experience_years=5,
        cv_text="Engineer",
    )
    db.add(cand)
    db.flush()
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
            context_key="ctx:rocs",
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
        email="rocs@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def test_read_only_calendar_sync_flow(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        settings = get_settings()
        assert settings.microsoft_calendar_write_enabled is False

        agg = client.get("/api/v1/candidates/me/calendar-sync")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "122_read_only_calendar_sync"
        assert body["schema"] == "twin.read_only_calendar_sync/v1"
        assert body["consent"]["default_off"] is True
        assert body["consent"]["ms_busy_read_opt_in"] is False
        assert body["safety"]["microsoft_calendar_write"] is False
        assert body["safety"]["graph_write_scopes"] is False
        assert body["safety"]["silent_approved_plan_rewrite"] is False
        assert body["safety"]["consent_default_off"] is True
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert "Calendars.ReadWrite" not in body["microsoft"]["scopes"]
        assert body["routes"]["consent_center"] == "/dashboard/consent-center"

        # Consent off → sync stays internal_only_ms_consent_false
        sync0 = client.post(
            "/api/v1/candidates/me/calendar-sync/runs",
            json={
                "synthetic_busy": [
                    {
                        "starts_at": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
                        "ends_at": (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat()
                        + "Z",
                        "subject": "SECRET",
                        "attendees": ["a@b.com"],
                    }
                ]
            },
        )
        assert sync0.status_code == 201, sync0.text
        assert sync0.json()["sync_run"]["mode"] == "internal_only_ms_consent_false"
        assert sync0.json()["silent_approved_plan_rewrite"] is False

        # Enable consent + store blocks
        cons = client.patch(
            "/api/v1/candidates/me/calendar-sync/consent",
            json={
                "ms_busy_read_opt_in": True,
                "store_availability_blocks": True,
                "ics_export_opt_in": True,
            },
        )
        assert cons.status_code == 200
        assert cons.json()["consent"]["ms_busy_read_opt_in"] is True
        assert cons.json()["consent"]["version"] >= 2

        busy_start = (datetime.utcnow() + timedelta(days=2)).replace(microsecond=0)
        busy_end = busy_start + timedelta(hours=2)
        sync1 = client.post(
            "/api/v1/candidates/me/calendar-sync/runs",
            json={
                "idempotency_key": "test-sync-1",
                "synthetic_busy": [
                    {
                        "starts_at": busy_start.isoformat() + "Z",
                        "ends_at": busy_end.isoformat() + "Z",
                        "subject": "SHOULD_STRIP",
                        "organizer": "boss@co",
                    }
                ],
            },
        )
        assert sync1.status_code == 201, sync1.text
        assert sync1.json()["sync_run"]["mode"] == "synthetic_busy_adapter"
        delta = sync1.json()["delta"]
        assert delta["added"]
        assert all(a.get("subject") is None for a in delta["added"])

        # Idempotent replay
        sync2 = client.post(
            "/api/v1/candidates/me/calendar-sync/runs",
            json={"idempotency_key": "test-sync-1", "synthetic_busy": []},
        )
        assert sync2.status_code == 201
        assert sync2.json()["idempotent"] is True

        # Seed approved batch overlapping busy → recalculation proposal
        batch = CandidateCommitmentBatch(
            candidate_id=cand.id,
            batch_key="batch:rocs",
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
        db.add(
            CandidateCommitmentBatchItem(
                candidate_id=cand.id,
                item_key="cbi:rocs",
                batch_id=batch.id,
                status="approved",
                title="Internal hold",
                starts_at=busy_start + timedelta(minutes=30),
                ends_at=busy_start + timedelta(minutes=90),
                effort_minutes=60,
                is_hold=True,
                external_created=False,
                progress_json="{}",
                kpi_excluded=True,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()

        sync3 = client.post(
            "/api/v1/candidates/me/calendar-sync/runs",
            json={
                "synthetic_busy": [
                    {
                        "starts_at": busy_start.isoformat() + "Z",
                        "ends_at": busy_end.isoformat() + "Z",
                    }
                ]
            },
        )
        assert sync3.status_code == 201
        recalc = sync3.json().get("recalculation")
        assert recalc is not None
        assert recalc["requires_approval"] is True
        assert recalc["silent"] is False
        pid = recalc["id"]

        rej = client.post(
            f"/api/v1/candidates/me/calendar-sync/recalculations/{pid}/resolve",
            json={"action": "reject"},
        )
        assert rej.status_code == 200
        assert rej.json()["acal_mutated"] is False
        assert rej.json()["state_mutated_acal"] is False

        # New sync + approve recalc
        sync4 = client.post(
            "/api/v1/candidates/me/calendar-sync/runs",
            json={
                "synthetic_busy": [
                    {
                        "starts_at": busy_start.isoformat() + "Z",
                        "ends_at": busy_end.isoformat() + "Z",
                    }
                ]
            },
        )
        pid2 = sync4.json()["recalculation"]["id"]
        appr = client.post(
            f"/api/v1/candidates/me/calendar-sync/recalculations/{pid2}/resolve",
            json={"action": "approve"},
        )
        assert appr.status_code == 200
        assert appr.json()["acal_mutated"] is False

        # Private feed
        feed = client.post("/api/v1/candidates/me/calendar-sync/feeds")
        assert feed.status_code == 201, feed.text
        assert feed.json()["external_booking"] is False
        assert feed.json()["ics_is_confirmation"] is False
        token = feed.json()["token"]
        fid = feed.json()["feed"]["id"]
        ics = client.get(f"/api/v1/public/calendar-feed/{token}.ics")
        assert ics.status_code == 200
        assert "X-TWIN-EXTERNAL-BOOKING:FALSE" in ics.text
        assert "ATTENDEE" not in ics.text

        rev = client.post(f"/api/v1/candidates/me/calendar-sync/feeds/{fid}/revoke")
        assert rev.status_code == 200
        assert rev.json()["revoked"] is True
        ics2 = client.get(f"/api/v1/public/calendar-feed/{token}.ics")
        assert ics2.status_code == 404

        # Revoke consent purges busy
        client.patch(
            "/api/v1/candidates/me/calendar-sync/consent",
            json={"ms_busy_read_opt_in": False},
        )
        # Internal-only still works via execution calendar
        snap = client.post(
            "/api/v1/candidates/me/execution-calendar/availability/snapshots",
            json={"use_microsoft_busy": False},
        )
        assert snap.status_code == 201

        disc = client.post("/api/v1/candidates/me/calendar-sync/disconnect")
        assert disc.status_code == 200
        assert disc.json()["internal_only"] is True

        exp = client.get("/api/v1/candidates/me/calendar-sync/export")
        assert exp.status_code == 200
        assert exp.json()["tokens_excluded"] is True

        dele = client.post("/api/v1/candidates/me/calendar-sync/delete-history")
        assert dele.status_code == 200
        assert dele.json()["propagated"] is True
    finally:
        app.dependency_overrides.clear()
