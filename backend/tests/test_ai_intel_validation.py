"""Unit tests for AI intel real-validation OS — no invented real orgs."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.database.models import (
    PilotAiValidationEvent,
    PilotAiValidationPlan,
    PilotInvitationPack,
    PilotOrganization,
    PilotSupportTicket,
)
from app.database.session import get_db
from app.main import create_app
from app.services import ai_intel_validation as aiv
from tests.test_auth_integration import _sqlite_session


def _client(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    monkeypatch.delenv("AI_INTEL_KILL_SWITCH", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        PilotOrganization.__table__,
        PilotInvitationPack.__table__,
        PilotSupportTicket.__table__,
        PilotAiValidationPlan.__table__,
        PilotAiValidationEvent.__table__,
    ):
        table.create(bind=bind, checkfirst=True)

    def override_db():
        try:
            yield db
        finally:
            pass

    from app.limiter import limiter

    try:
        limiter.reset()
    except Exception:
        pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), db, app, get_settings


def test_approval_search_no_complete(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        db.add(
            PilotOrganization(
                slug="synth-probe",
                display_name="Synth",
                approval_status="CANDIDATE",
                is_synthetic=True,
            )
        )
        db.commit()
        result = aiv.search_approval_state(db)
        assert result["result"] == aiv.APPROVAL_NO_COMPLETE
        view = aiv.command_view(db)
        assert view["verdict"] == aiv.VERDICT_AWAITING_ORG
        assert view["evidence_tier"] == aiv.TIER_READY
        assert view["scores"]["AI_REAL_USER_ADOPTION_SCORE"] == 0
        assert view["scores"]["AI_REAL_CUSTOMER_VALUE_SCORE"] == 0
        assert view["kpi"]["token"] == "NO_REAL_PILOT_DATA"
        assert view["kpi"]["real_customer_validated"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_ai_validation_api_and_event_privacy(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        res = client.get(
            "/api/v1/admin/pilot-os/ai-validation",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert "AWAITING FOUNDER-APPROVED" in body["verdict"]
        assert body["approval_search"]["result"] == aiv.APPROVAL_NO_COMPLETE

        gate = client.get(
            "/api/v1/admin/pilot-os/ai-validation/safety-gate",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert gate.status_code == 200
        assert gate.json()["pass"] is True

        row = aiv.record_event(
            db,
            event_name="feedback_submitted",
            organization_id=None,
            is_synthetic=True,
            metadata={"cv_text": "SECRET", "email": "a@b.c", "ok": 1},
        )
        assert row is not None
        meta = row.metadata_json or ""
        assert "SECRET" not in meta
        assert "a@b.c" not in meta
        assert "ok" in meta
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_scores_do_not_infer_real_from_synthetic(monkeypatch) -> None:
    scores = aiv.validation_scores(synthetic_smoke_pass=True)
    assert scores["AI_TECHNICAL_READINESS_SCORE"] == 100
    assert scores["AI_SYNTHETIC_VALIDATION_SCORE"] == 100
    assert scores["AI_REAL_USER_ADOPTION_SCORE"] == 0
    assert scores["AI_PUBLIC_LAUNCH_EVIDENCE_SCORE"] <= 15
    section = aiv.ai_invitation_section()
    assert section["human_decision"] is True
    does = " ".join(section["does"]).lower()
    assert "bias-free" not in does
    assert "ai act" not in does
    assert any("bias-free" in x.lower() or "ai act" in x.lower() for x in section["does_not"])
    assert section["status"].startswith("READY_UNSENT")
