"""Acceptance Calendar — aggregation, feasibility, holds, no MS write."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Application,
    Candidate,
    CandidateAcceptanceItem,
    CandidateAcceptanceItemAudit,
    CandidateAcceptanceOutcome,
    CandidateAvailabilityBlock,
    CandidateCalendarConsent,
    CandidateCalendarPreference,
    CandidateCareerCompass,
    CandidateCareerGoal,
    CandidateCareerReminder,
    CandidateDailyCadence,
    CandidateProposedHold,
    CandidateTimeBudget,
    CandidateWeeklyPlan,
    ScheduledInterview,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import acceptance_calendar as acal
from app.services import career_copilot as cc
from app.services.microsoft_calendar_oauth import (
    FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS,
    sanitize_microsoft_calendar_scopes,
)
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "acceptance-cal-test-secret")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateCareerCompass.__table__,
        CandidateCareerGoal.__table__,
        CandidateCareerReminder.__table__,
        CandidateDailyCadence.__table__,
        Application.__table__,
        ScheduledInterview.__table__,
        CandidateAcceptanceOutcome.__table__,
        CandidateTimeBudget.__table__,
        CandidateCalendarConsent.__table__,
        CandidateCalendarPreference.__table__,
        CandidateAcceptanceItem.__table__,
        CandidateProposedHold.__table__,
        CandidateAvailabilityBlock.__table__,
        CandidateWeeklyPlan.__table__,
        CandidateAcceptanceItemAudit.__table__,
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="acal@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Acceptance Cal Tester",
        skills='["Python"]',
        experience_years=4,
        cv_text="Engineer",
    )
    db.add(cand)
    db.flush()
    db.add(
        CandidateCareerCompass(
            candidate_id=cand.id,
            target_role="Backend Engineer",
            target_seniority="senior",
            work_mode="remote",
            skill_gaps="[]",
            strengths='["Python"]',
            next_steps="[]",
            learning_actions="[]",
            completion_status="partial",
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
        email="acal@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def test_aggregate_refresh_and_views(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        db.add(
            ScheduledInterview(
                user_id=user.id,
                company_name="SynthCo",
                job_title="Engineer",
                interview_start=datetime.utcnow() + timedelta(days=2),
                interview_end=datetime.utcnow() + timedelta(days=2, hours=1),
                status="scheduled",
            )
        )
        db.add(
            CandidateCareerGoal(
                candidate_id=cand.id, title="Ship portfolio", goal_type="career", status="active"
            )
        )
        db.commit()
        res = client.get("/api/v1/candidates/me/acceptance-calendar")
        assert res.status_code == 200
        body = res.json()
        assert body["schema"] == "twin.acceptance_calendar/v1"
        assert body["safety"]["microsoft_write"] is False
        assert body["safety"]["autonomous_scheduling"] is False
        assert body["microsoft"]["write_enabled"] is False
        assert body["alembic"] == "110_acceptance_calendar"
        assert any(i["category"] == "interview" for i in body.get("agenda") or [])
        v = client.get("/api/v1/candidates/me/acceptance-calendar/views/interviews")
        assert v.status_code == 200
        assert len(v.json()["items"]) >= 1
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_budget_explicit_only_and_feasibility(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        r = client.patch(
            "/api/v1/candidates/me/acceptance-calendar/budget",
            json={"hours_per_week": 6, "timezone": "Europe/Warsaw"},
        )
        assert r.status_code == 200
        assert r.json()["budget"]["inferred_private_obligations"] is False
        assert r.json()["budget"]["hours_per_week"] == 6
        f = client.get("/api/v1/candidates/me/acceptance-calendar/feasibility")
        assert f.status_code == 200
        assert f.json()["status"] in acal.FEASIBILITY
        assert f.json()["external_auto_schedule"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_holds_never_external_write(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        acal.upsert_item(
            db,
            candidate_id=cand.id,
            item_key="goal:manual",
            category="goal",
            title="Prep case study",
            importance=80,
            claim_kind=cc.CLAIM_SUGGESTION,
            state="unscheduled",
        )
        db.commit()
        r = client.post("/api/v1/candidates/me/acceptance-calendar/holds/propose")
        assert r.status_code == 200
        assert r.json()["microsoft_write"] is False
        assert r.json()["externally_booked"] is False
        holds = r.json()["holds"]
        assert holds
        hid = holds[0]["id"]
        a = client.post(
            f"/api/v1/candidates/me/acceptance-calendar/holds/{hid}/action",
            json={"action": "accept"},
        )
        assert a.status_code == 200
        assert a.json()["external_created"] is False
        assert a.json()["hold"]["status"] == "ACCEPTED_INTERNAL"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_consent_not_bundled_and_ics_gate(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        c = client.patch(
            "/api/v1/candidates/me/acceptance-calendar/consent",
            json={"ics_export_opt_in": False, "ms_busy_read_opt_in": False},
        )
        assert c.status_code == 200
        assert c.json()["consent"]["bundled_opt_in"] is False
        ics = client.get("/api/v1/candidates/me/acceptance-calendar/ics")
        assert ics.status_code == 400
        client.patch(
            "/api/v1/candidates/me/acceptance-calendar/consent",
            json={"ics_export_opt_in": True},
        )
        acal.upsert_item(
            db,
            candidate_id=cand.id,
            item_key="block:1",
            category="planning_block",
            title="Focus block",
            starts_at=datetime.utcnow() + timedelta(days=1),
            ends_at=datetime.utcnow() + timedelta(days=1, hours=1),
            state="scheduled",
            claim_kind=cc.CLAIM_SUGGESTION,
        )
        db.commit()
        ics2 = client.get("/api/v1/candidates/me/acceptance-calendar/ics")
        assert ics2.status_code == 200
        text = ics2.text
        assert "BEGIN:VCALENDAR" in text
        assert "ATTENDEE" not in text
        assert "ORGANIZER" not in text
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_outcome_no_hiring_certainty(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        r = client.post(
            "/api/v1/candidates/me/acceptance-calendar/outcomes",
            json={"title": "Land a role I would accept", "description": "Candidate-defined"},
        )
        assert r.status_code == 201
        assert r.json()["outcome"]["hiring_certainty"] == "UNKNOWN"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_weekly_plan_requires_approval(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        r = client.post("/api/v1/candidates/me/acceptance-calendar/weekly-plan")
        assert r.status_code == 201
        plan = r.json()["plan"]
        assert plan["user_approved"] is None
        assert plan["strategy"]["requires_user_approval"] is True
        a = client.post(
            f"/api/v1/candidates/me/acceptance-calendar/weekly-plan/{plan['id']}/approve",
            json={"approved": True},
        )
        assert a.status_code == 200
        assert a.json()["plan"]["user_approved"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_item_actions_persist_and_isolation(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        item = acal.upsert_item(
            db,
            candidate_id=cand.id,
            item_key="rem:1",
            category="reminder",
            title="Follow up",
            state="proposed",
            claim_kind=cc.CLAIM_FACT,
        )
        db.commit()
        r = client.post(
            f"/api/v1/candidates/me/acceptance-calendar/items/{item.id}/action",
            json={"action": "protect"},
        )
        assert r.status_code == 200
        assert r.json()["item"]["state"] == "protected"
        # Cross-candidate deny via wrong id
        other = User(
            email="other-acal@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(other)
        db.flush()
        other_c = Candidate(user_id=other.id, name="Other", skills="[]", experience_years=1)
        db.add(other_c)
        db.flush()
        foreign = acal.upsert_item(
            db,
            candidate_id=other_c.id,
            item_key="foreign",
            category="goal",
            title="Foreign",
            claim_kind=cc.CLAIM_UNKNOWN,
        )
        db.commit()
        denied = client.post(
            f"/api/v1/candidates/me/acceptance-calendar/items/{foreign.id}/action",
            json={"action": "complete"},
        )
        assert denied.status_code == 404
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_ms_scopes_forbid_write_and_flag_off(monkeypatch):
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    s = get_settings()
    assert s.microsoft_calendar_write_enabled is False
    dirty = sanitize_microsoft_calendar_scopes("Calendars.ReadWrite Mail.Send Calendars.Read")
    for tok in FORBIDDEN_MS_CALENDAR_SCOPE_TOKENS:
        assert tok not in dirty.split()
    assert "Calendars.Read" in dirty
    get_settings.cache_clear()


def test_delete_and_export_privacy(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        acal.upsert_item(
            db,
            candidate_id=cand.id,
            item_key="x",
            category="learning",
            title="Learn",
            claim_kind=cc.CLAIM_SUGGESTION,
            payload={"mastery_claim": False},
        )
        db.commit()
        exp = client.get("/api/v1/candidates/me/acceptance-calendar/export")
        assert exp.status_code == 200
        assert exp.json()["kpi_excluded"] is True
        d = client.post("/api/v1/candidates/me/acceptance-calendar/history/delete")
        assert d.status_code == 200
        assert d.json()["ok"] is True
        assert db.query(CandidateAcceptanceItem).filter_by(candidate_id=cand.id).count() == 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_prefs_no_guilt_streaks(monkeypatch):
    db, cand, user, client, app, get_settings = _setup(monkeypatch)
    try:
        r = client.post(
            "/api/v1/candidates/me/acceptance-calendar/preferences",
            json={"prefs": {"guilt_nudge": True, "streak": 5, "prefer_mornings": True}},
        )
        assert r.status_code == 200
        prefs = r.json()["preference"]["prefs"]
        assert "guilt_nudge" not in prefs
        assert "streak" not in prefs
        assert prefs.get("no_guilt") is True
        assert prefs.get("prefer_mornings") is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
