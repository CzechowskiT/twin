"""Daily Career Operating System — brief, inbox, fatigue, privacy, isolation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Application,
    Candidate,
    CandidateCareerAction,
    CandidateCareerChangeEvent,
    CandidateCareerCompass,
    CandidateCareerDecision,
    CandidateCareerDirection,
    CandidateCareerGoal,
    CandidateCareerGraph,
    CandidateCareerHealthSnapshot,
    CandidateCareerInboxItem,
    CandidateCareerReflection,
    CandidateCareerScenario,
    CandidateCareerTimelineEvent,
    CandidateCopilotMemory,
    CandidateCopilotPreference,
    CandidateCopilotRecommendation,
    CandidateDailyBrief,
    CandidateDailyCadence,
    CandidateDailyPrivacySettings,
    CandidateLearningLoopEntry,
    CandidateMomentumSnapshot,
    CandidateOpportunityWatch,
    CandidateProgressReview,
    CandidateRecommendationWeights,
    CandidateCareerReminder,
    CandidateSkillEvolution,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import career_copilot as cc
from app.services import career_daily_os as daily
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "daily-os-test-secret")
    monkeypatch.delenv("AI_INTEL_KILL_SWITCH", raising=False)
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    tables = [
        User.__table__,
        Candidate.__table__,
        CandidateCareerCompass.__table__,
        CandidateCareerGraph.__table__,
        CandidateCareerDirection.__table__,
        CandidateCareerGoal.__table__,
        CandidateCareerAction.__table__,
        CandidateCopilotRecommendation.__table__,
        CandidateCareerDecision.__table__,
        CandidateCareerReflection.__table__,
        CandidateCopilotMemory.__table__,
        CandidateCopilotPreference.__table__,
        CandidateCareerTimelineEvent.__table__,
        CandidateSkillEvolution.__table__,
        CandidateCareerHealthSnapshot.__table__,
        CandidateLearningLoopEntry.__table__,
        CandidateCareerScenario.__table__,
        CandidateDailyBrief.__table__,
        CandidateCareerChangeEvent.__table__,
        CandidateCareerInboxItem.__table__,
        CandidateDailyCadence.__table__,
        CandidateDailyPrivacySettings.__table__,
        CandidateRecommendationWeights.__table__,
        CandidateMomentumSnapshot.__table__,
        CandidateOpportunityWatch.__table__,
        CandidateProgressReview.__table__,
        CandidateCareerReminder.__table__,
    ]
    # optional Application
    try:
        tables.append(Application.__table__)
    except Exception:
        pass
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="dailyos@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Daily OS Tester",
        skills='["Python","SQL"]',
        experience_years=4,
        cv_text="Backend engineer",
    )
    db.add(cand)
    db.flush()
    db.add(
        CandidateCareerCompass(
            candidate_id=cand.id,
            target_role="Senior Backend Engineer",
            target_seniority="senior",
            work_mode="remote",
            skill_gaps='["Kubernetes"]',
            strengths='["Python"]',
            next_steps='["Ship API"]',
            learning_actions='["DDIA"]',
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
        email="dailyos@example.com"
    ).one()
    return db, cand, TestClient(app), app, get_settings


def test_daily_brief_persistent_and_dismissible(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        brief = daily.ensure_daily_brief(db, candidate_id=cand.id)
        assert brief.get("headline")
        assert brief.get("body", {}).get("motivational_filler") is False
        assert brief.get("kpi_excluded") is True
        dismissed = daily.mutate_brief(db, candidate_id=cand.id, action="dismiss")
        assert dismissed["status"] == "dismissed"
        again = daily.ensure_daily_brief(db, candidate_id=cand.id)
        assert again.get("status") == "dismissed"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_inbox_actions_and_fatigue_cap(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        daily.update_cadence(db, candidate_id=cand.id, daily_cap=2, intensity="low")
        changes = daily.detect_changes(db, candidate_id=cand.id)
        items = daily.build_priorities_and_nba(db, candidate_id=cand.id, changes=changes)
        assert len(items) <= 3
        if items:
            row = daily.mutate_inbox(
                db, candidate_id=cand.id, item_id=items[0].id, action="snooze", snooze_hours=2
            )
            assert row.status == "SNOOZED"
            reopened = daily.mutate_inbox(
                db, candidate_id=cand.id, item_id=items[0].id, action="reopen"
            )
            assert reopened.status == "NEW"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_no_fabricated_market_in_changes(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        changes = daily.detect_changes(db, candidate_id=cand.id)
        market = [c for c in changes if c.get("entity_type") == "market"]
        assert market
        assert market[0]["change_kind"] == "UNKNOWN"
        assert market[0]["claim_kind"] == cc.CLAIM_UNKNOWN
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_privacy_disables_briefs_and_learning(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        daily.update_privacy(db, candidate_id=cand.id, briefs_enabled=False, learning_enabled=False)
        brief = daily.ensure_daily_brief(db, candidate_id=cand.id)
        assert brief.get("enabled") is False
        cal = daily.calibrate_from_learning_loop(db, candidate_id=cand.id)
        assert cal.get("skipped") is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_watchlist_freshness_unknown(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        w = daily.add_watch(
            db, candidate_id=cand.id, watch_type="role", label="Staff Engineer"
        )
        assert w.freshness == "UNKNOWN"
        deltas = daily.watchlist_deltas(db, candidate_id=cand.id)
        assert deltas[0]["claim_kind"] == cc.CLAIM_UNKNOWN
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_reminder_email_requires_opt_in(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        try:
            daily.schedule_reminder(
                db,
                candidate_id=cand.id,
                title="Check applications",
                due_at=datetime.utcnow() + timedelta(hours=2),
                channel="email",
            )
            assert False, "should require opt-in"
        except ValueError as exc:
            assert "opt" in str(exc)
        daily.update_privacy(db, candidate_id=cand.id, email_reminders_opt_in=True)
        row = daily.schedule_reminder(
            db,
            candidate_id=cand.id,
            title="Check applications",
            due_at=datetime.utcnow() + timedelta(hours=2),
            channel="email",
        )
        assert row.channel == "email"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_progress_review_requires_approval(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        cc.create_goal(db, candidate_id=cand.id, title="Reach staff", goal_type="career")
        review = daily.create_progress_review(db, candidate_id=cand.id, period="weekly")
        assert review.user_approved is None
        approved = daily.approve_progress_review(
            db, candidate_id=cand.id, review_id=review.id, approved=True
        )
        assert approved.user_approved is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_cross_candidate_inbox_isolation(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        u2 = User(
            email="other-daily@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(u2)
        db.flush()
        other = Candidate(user_id=u2.id, name="Other", skills="[]")
        db.add(other)
        db.commit()
        daily.upsert_inbox_item(
            db, candidate_id=cand.id, item_key="mine", kind="test", title="Mine"
        )
        daily.upsert_inbox_item(
            db, candidate_id=other.id, item_key="theirs", kind="test", title="Theirs"
        )
        mine = daily.list_inbox(db, candidate_id=cand.id)
        theirs = daily.list_inbox(db, candidate_id=other.id)
        assert all(m["title"] == "Mine" for m in mine)
        assert all(t["title"] == "Theirs" for t in theirs)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_daily_aggregate_api_continuity(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        res = client.get("/api/v1/candidates/me/career-copilot/daily")
        assert res.status_code == 200, res.text
        body = res.json()
        assert body.get("daily_os") or body.get("product") == "daily_career_operating_system"
        daily_block = body.get("daily_os") or {}
        assert daily_block.get("continuity", {}).get("never_starts_from_zero") is True
        assert daily_block.get("safety", {}).get("external_auto_action") is False
        assert daily_block.get("analytics", {}).get("kpi_excluded") is True
        assert daily_block.get("phase_3_career_agent") == "NOT_STARTED"
        assert "adaptive" in body
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_application_command_center_draft_only(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        center = daily.application_command_center(db, candidate_id=cand.id)
        assert center["auto_submit"] is False
        assert center["draft_only"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_risks_no_mental_health(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        risks = daily.detect_risks(db, candidate_id=cand.id)
        blob = str(risks).lower()
        assert "depression" not in blob
        assert "anxiety" not in blob
        assert "mental" not in blob
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_reminder_in_product_delivery_and_idempotency(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        row = daily.schedule_reminder(
            db,
            candidate_id=cand.id,
            title="Due now",
            due_at=datetime.utcnow() - timedelta(minutes=1),
            channel="in_product",
        )
        first = daily.deliver_career_reminder(db, reminder_id=row.id)
        assert first["result"] == "delivered"
        assert first["sent"] is False
        db.refresh(row)
        assert row.status == "delivered"
        second = daily.deliver_career_reminder(db, reminder_id=row.id)
        assert second["result"] == "already_done"
        assert second.get("idempotent") is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_reminder_quiet_hours_and_dry_run_no_send(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        daily.update_cadence(
            db,
            candidate_id=cand.id,
            timezone_name="UTC",
            quiet_mode=True,
        )
        row = daily.schedule_reminder(
            db,
            candidate_id=cand.id,
            title="Quiet blocked",
            due_at=datetime.utcnow() - timedelta(minutes=1),
            channel="in_product",
        )
        out = daily.deliver_career_reminder(db, reminder_id=row.id)
        assert out["result"] == "skipped_quiet_hours"
        db.refresh(row)
        assert row.status == "scheduled"

        dry = daily.deliver_career_reminder(db, reminder_id=row.id, dry_run=True, force=True)
        assert dry.get("sent") is not True
        assert "dry_run" in str(dry.get("result"))
        db.refresh(row)
        assert row.status == "scheduled"

        res = client.post(
            "/api/v1/candidates/me/career-copilot/daily/reminders/dry-run",
            json={"reminder_id": row.id},
        )
        assert res.status_code == 200
        assert res.json().get("sent") is not True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_reminder_email_blocked_without_consent_on_deliver(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        daily.update_privacy(db, candidate_id=cand.id, email_reminders_opt_in=True)
        row = daily.schedule_reminder(
            db,
            candidate_id=cand.id,
            title="Email later",
            due_at=datetime.utcnow() - timedelta(minutes=1),
            channel="email",
        )
        daily.update_privacy(db, candidate_id=cand.id, email_reminders_opt_in=False)
        out = daily.deliver_career_reminder(db, reminder_id=row.id, force=True)
        assert out["result"] == "blocked_no_email_consent"
        assert out.get("would_send") is False
        assert out.get("unauthorized_send") is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_career_reminder_beat_registered(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "daily-os-test-secret")
    monkeypatch.setenv("CAREER_REMINDER_BEAT_ENABLED", "true")
    from app.config import get_settings
    from app.tasks import celery_app as ca

    get_settings.cache_clear()
    ca._configure_beat_schedule()
    assert "career-reminders-hourly" in ca.celery_app.conf.beat_schedule
    get_settings.cache_clear()
