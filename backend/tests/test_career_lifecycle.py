"""Unified Career Lifecycle — orchestration; no silent phase change; no duplicate stores."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import (
    Candidate,
    CandidateAcceptanceItem,
    CandidateCareerInboxItem,
    CandidateLifecycleApproval,
    CandidateLifecycleAudit,
    CandidateLifecycleContext,
    CandidateLifecycleEvent,
    CandidateLifecycleFinding,
    CandidateLifecycleHandoff,
    CandidateLifecyclePrivacy,
    User,
)
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "career-lifecycle-test-secret-32chars!!")
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
    ]
    for table in tables:
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="lifecycle@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Lifecycle Tester",
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
        email="lifecycle@example.com"
    ).one()
    return db, cand, user, TestClient(app), app, get_settings


def test_lifecycle_no_silent_phase_and_focus_preserves(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        agg = client.get("/api/v1/candidates/me/career-lifecycle")
        assert agg.status_code == 200, agg.text
        body = agg.json()
        assert body["alembic"] == "115_unified_career_lifecycle"
        assert body["safety"]["silent_phase_change"] is False
        assert body["safety"]["duplicate_module_stores"] is False
        assert body["safety"]["focus_deletes_other_processes"] is False
        assert body["safety"]["bundled_approvals"] is False
        assert body["safety"]["phase_3_career_agent"] == "NOT_STARTED"
        assert body["context"]["uuid_key"] is True
        phase0 = body["context"]["active_phase"]

        prop = client.post(
            "/api/v1/candidates/me/career-lifecycle/phase/propose",
            json={"phase": "EVIDENCE", "reason": "test"},
        )
        assert prop.status_code == 200
        assert prop.json()["silent_change"] is False
        assert prop.json()["status"] == "pending_approval"
        assert prop.json()["active_phase"] == phase0
        aid = prop.json()["approval_id"]

        # Still unchanged until approve
        mid = client.get("/api/v1/candidates/me/career-lifecycle")
        assert mid.json()["context"]["active_phase"] == phase0

        ok = client.post(
            f"/api/v1/candidates/me/career-lifecycle/approvals/{aid}/resolve",
            json={"approved": True},
        )
        assert ok.status_code == 200
        assert ok.json()["active_phase"] == "EVIDENCE"
        assert ok.json()["bundled"] is False

        focus = client.post(
            "/api/v1/candidates/me/career-lifecycle/focus",
            json={"focus_type": "interview", "focus_ref": "proc:1"},
        )
        assert focus.status_code == 200
        assert focus.json()["other_processes_preserved"] is True

        ho = client.post(
            "/api/v1/candidates/me/career-lifecycle/handoffs",
            json={
                "from_module": "application_studio",
                "to_module": "interview_decision",
                "from_object_id": "1",
                "to_object_id": "2",
                "snapshot_hash": "abc",
            },
        )
        assert ho.status_code == 201

        cons = client.post("/api/v1/candidates/me/career-lifecycle/consistency")
        assert cons.status_code == 200
        assert cons.json()["silent_disagreement"] is False

        search = client.post(
            "/api/v1/candidates/me/career-lifecycle/search",
            json={"q": "zz"},
        )
        assert search.status_code == 200
        assert search.json()["leaks_other_candidates"] is False

        hist = client.get("/api/v1/candidates/me/career-lifecycle/history")
        assert hist.status_code == 200
        assert isinstance(hist.json()["events"], list)

        dl = client.post(
            "/api/v1/candidates/me/career-lifecycle/deep-link",
            json={"target": "history"},
        )
        assert dl.status_code == 200
        assert dl.json()["context_lost"] is False
        assert dl.json()["preserve_context"] is True

        exp = client.get("/api/v1/candidates/me/career-lifecycle/export")
        assert exp.status_code == 200
        assert exp.json()["full_module_payloads_excluded"] is True
        assert exp.json()["secrets_excluded"] is True

        graph = client.get("/api/v1/candidates/me/career-lifecycle/deletion-graph")
        assert graph.status_code == 200
        assert "lifecycle_context" in graph.json()["order"]

        priv = client.patch(
            "/api/v1/candidates/me/career-lifecycle/privacy",
            json={"export_include_module_notes": False, "paused": False},
        )
        assert priv.status_code == 200
        assert priv.json()["propagated"] is True

        nxt = client.post("/api/v1/candidates/me/career-lifecycle/next-cycle")
        assert nxt.status_code == 200
        assert nxt.json()["context"]["active_phase"] == "UNDERSTAND"

        deleted = client.post("/api/v1/candidates/me/career-lifecycle/delete")
        assert deleted.status_code == 200
        assert deleted.json()["stale_reappear_guard"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_lifecycle_bundled_approval_forbidden(monkeypatch):
    db, cand, _user, client, app, get_settings = _setup(monkeypatch)
    try:
        ctx = CandidateLifecycleContext(
            candidate_id=cand.id,
            context_key="ctx:test",
            active_phase="UNDERSTAND",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(ctx)
        db.flush()
        bad = CandidateLifecycleApproval(
            candidate_id=cand.id,
            context_id=ctx.id,
            approval_key="apr:bundled",
            approval_kind="phase_change",
            status="pending",
            bundled=True,
            before_json='{"phase":"UNDERSTAND"}',
            after_json='{"phase":"EVIDENCE"}',
            created_at=datetime.utcnow(),
        )
        db.add(bad)
        db.commit()
        res = client.post(
            f"/api/v1/candidates/me/career-lifecycle/approvals/{bad.id}/resolve",
            json={"approved": True},
        )
        assert res.status_code == 400
        assert "bundled" in (res.json().get("detail") or "").lower()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
