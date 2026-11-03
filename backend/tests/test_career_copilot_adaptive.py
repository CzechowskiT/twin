"""Adaptive Career Intelligence — memory, prefs, ranking, health, scenarios, safety."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateCareerAction,
    CandidateCareerCompass,
    CandidateCareerDecision,
    CandidateCareerDirection,
    CandidateCareerGoal,
    CandidateCareerGraph,
    CandidateCareerHealthSnapshot,
    CandidateCareerReflection,
    CandidateCareerScenario,
    CandidateCareerTimelineEvent,
    CandidateCopilotMemory,
    CandidateCopilotPreference,
    CandidateCopilotRecommendation,
    CandidateLearningLoopEntry,
    CandidateSkillEvolution,
    User,
)
from app.database.session import get_db
from app.main import create_app
from app.services import career_copilot as cc
from app.services import career_copilot_adaptive as adaptive
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch, *, kill_switch: bool = False):
    monkeypatch.setenv("SECRET_KEY", "adaptive-copilot-test-secret")
    if kill_switch:
        monkeypatch.setenv("AI_INTEL_KILL_SWITCH", "true")
    else:
        monkeypatch.delenv("AI_INTEL_KILL_SWITCH", raising=False)
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
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
    ):
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="adaptive@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Adaptive Tester",
        skills='["Python","FastAPI","SQL"]',
        experience_years=5,
        cv_text="Backend engineer with Python",
    )
    db.add(cand)
    db.flush()
    compass = CandidateCareerCompass(
        candidate_id=cand.id,
        target_role="Senior Backend Engineer",
        target_seniority="senior",
        work_mode="remote",
        preferred_industries='["SaaS"]',
        skill_gaps='["Kubernetes"]',
        strengths='["Python"]',
        next_steps='["Ship portfolio API"]',
        learning_actions='["Read DDIA"]',
        completion_status="partial",
    )
    db.add(compass)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db

    def override_user():
        return db.query(User).filter(User.email == "adaptive@example.com").one()

    app.dependency_overrides[get_current_user] = override_user
    client = TestClient(app)
    return db, cand, client, app, get_settings


def test_memory_versioning_never_silent_overwrite(monkeypatch):
    db, cand, _client, app, get_settings = _setup(monkeypatch)
    try:
        m1 = adaptive.record_memory(
            db,
            candidate_id=cand.id,
            memory_key="decision:pivot",
            kind="career_decision",
            title="Chose IC path",
            body={"path": "ic"},
        )
        assert m1.version == 1
        m2 = adaptive.edit_memory(
            db,
            candidate_id=cand.id,
            memory_id=m1.id,
            title="Chose IC path (edited)",
            body={"path": "ic", "note": "v2"},
        )
        assert m2.version == 2
        assert m2.id != m1.id
        db.refresh(m1)
        assert m1.archived_at is not None
        assert m1.superseded_by_id == m2.id
        active = adaptive.list_memories(db, candidate_id=cand.id)
        assert len(active) == 1
        assert active[0]["version"] == 2
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_preference_inference_no_protected_attrs(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        prefs = adaptive.infer_preferences(db, candidate_id=cand.id)
        keys = {p.pref_key for p in prefs}
        assert "work_mode" in keys or "remote_preference" in keys
        assert "age" not in keys
        assert "gender" not in keys
        try:
            adaptive.set_preference_override(db, candidate_id=cand.id, pref_key="age", value={"v": 30})
            assert False, "should reject protected"
        except ValueError as exc:
            assert "forbidden" in str(exc)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_ranking_explain_and_market_unknown(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        cc.refresh_graph(db, candidate_id=cand.id)
        cc.refresh_directions(db, candidate_id=cand.id)
        cc.sync_direction_recommendations(db, candidate_id=cand.id)
        ranked = adaptive.rank_recommendations(db, candidate_id=cand.id)
        assert isinstance(ranked, list)
        if ranked:
            factors = ranked[0]["ranking_explain"]["factors"]
            market = next(f for f in factors if f["factor"] == "market")
            assert market["delta"] == 0
            assert "UNKNOWN" in market["why"] or market.get("claim") == cc.CLAIM_UNKNOWN
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_health_score_explainable(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        health = adaptive.compute_health_score(db, candidate_id=cand.id, force=True)
        assert "clarity" in health["dimensions"]
        assert health["dimensions"]["communication"]["claim"] == cc.CLAIM_UNKNOWN
        assert "employment certainty" in health["note"].lower() or "Not an employment" in health["note"]
        assert health["kpi_excluded"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_scenario_unlimited_no_fabricated_salary(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        row = adaptive.create_scenario(
            db,
            candidate_id=cand.id,
            options=["stay", "job_a", "abroad", "freelance", "management"],
            title="Test scenarios",
        )
        comparison = cc._loads(row.comparison_json, {})
        opts = comparison.get("options") or {}
        assert len(opts) >= 5
        for _k, v in opts.items():
            assert v.get("salary_trend") == "UNKNOWN" or any(
                c.get("kind") == cc.CLAIM_UNKNOWN for c in (v.get("claims") or [])
            )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_learning_loop_persists(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        entry = adaptive.submit_learning_loop(
            db,
            candidate_id=cand.id,
            useful=True,
            prediction_correct=False,
            surprise="Market UNKNOWN surprised me",
            improve_reasoning="Cite more profile facts",
        )
        assert entry.useful is True
        mems = adaptive.list_memories(db, candidate_id=cand.id)
        assert any(m["kind"] == "learning_loop" for m in mems)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_adaptive_aggregate_reuses_history(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch)
    try:
        adaptive.record_memory(
            db,
            candidate_id=cand.id,
            memory_key="seed",
            kind="event",
            title="Seed memory",
        )
        res = client.get("/api/v1/candidates/me/career-copilot")
        assert res.status_code == 200
        body = res.json()
        assert body.get("adaptive") or body.get("product") == "adaptive_career_copilot"
        ad = body.get("adaptive") or {}
        assert ad.get("evolution", {}).get("never_starts_from_zero") is True
        assert ad.get("analytics", {}).get("kpi_excluded") is True
        assert "age" not in str(ad.get("preferences") or []).lower()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_cross_tenant_memory_isolation(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        u2 = User(
            email="other-adaptive@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(u2)
        db.flush()
        other = Candidate(user_id=u2.id, name="Other", skills="[]")
        db.add(other)
        db.commit()
        adaptive.record_memory(db, candidate_id=cand.id, memory_key="private", kind="event", title="Mine")
        adaptive.record_memory(db, candidate_id=other.id, memory_key="private", kind="event", title="Theirs")
        mine = adaptive.list_memories(db, candidate_id=cand.id)
        theirs = adaptive.list_memories(db, candidate_id=other.id)
        assert all(m["title"] == "Mine" for m in mine)
        assert all(m["title"] == "Theirs" for m in theirs)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_opportunity_intelligence_unknowns(monkeypatch):
    db, cand, _c, app, get_settings = _setup(monkeypatch)
    try:
        intel = adaptive.opportunity_intelligence(
            db,
            candidate_id=cand.id,
            opportunity_title="Staff Backend",
            required_skills=["Python", "Kubernetes"],
        )
        assert "Python" in intel["strengths"]
        assert "Kubernetes" in intel["missing_skills"]
        assert "salary_band" in intel["unknowns"]
        assert intel["interview_readiness"] == "UNKNOWN"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_kill_switch_still_surfaces(monkeypatch):
    db, cand, client, app, get_settings = _setup(monkeypatch, kill_switch=True)
    try:
        res = client.get("/api/v1/candidates/me/career-copilot")
        assert res.status_code == 200
        body = res.json()
        safety = (body.get("adaptive") or {}).get("safety") or body.get("safety") or {}
        assert safety.get("ai_kill_switch") is True or body.get("overview", {}).get("ai_kill_switch") is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()