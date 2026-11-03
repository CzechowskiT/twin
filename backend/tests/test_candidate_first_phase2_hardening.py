"""Phase 2 candidate-first hardening — invite tokens, send dry-run, AI kill switch, CV magic."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.database.models import (
    CandidateInviteToken,
    CandidatePilotAllowlist,
    CandidatePilotCohort,
    CandidatePilotIntakeRow,
    CandidatePilotInvitationPack,
)
from app.database.session import get_db
from app.main import create_app
from app.services import candidate_first_pilot as cfp
from app.services import candidate_invite_tokens as invite_tokens
from app.services.cv_parser import CvParseError, assert_cv_content_matches_extension
from tests.test_auth_integration import _sqlite_session


def _client(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("EXTERNAL_PILOT_ENROLLMENT_ENABLED", "false")
    monkeypatch.setenv("PILOT_REGISTRATION_INVITE_ONLY", "true")
    monkeypatch.setenv("SECRET_KEY", "phase2-hardening-test-secret-key")
    monkeypatch.delenv("AI_INTEL_KILL_SWITCH", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        CandidatePilotCohort.__table__,
        CandidatePilotInvitationPack.__table__,
        CandidatePilotIntakeRow.__table__,
        CandidateInviteToken.__table__,
        CandidatePilotAllowlist.__table__,
    ):
        table.create(bind=bind, checkfirst=True)

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), db, app, get_settings


def _approved_pack(client: TestClient) -> tuple[int, int]:
    created = client.post(
        "/api/v1/admin/pilot-os/candidate-first/cohorts",
        headers={"Authorization": "Bearer ops-secret"},
        json={"slug": "phase2-cohort-pl", "display_name": "Phase2 Cohort"},
    )
    assert created.status_code == 200, created.text
    cid = created.json()["cohort"]["id"]
    approved = client.post(
        f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/approve",
        headers={"Authorization": "Bearer ops-secret"},
        json={
            "approved_by_label": "Founder",
            "founder_cohort_approval_ref": "PHASE2-COHORT-APPROVAL-01",
            "data_processing_basis_ref": "DPA-P2-001",
            "success_criteria_ref": "CF-SUCCESS-V1",
        },
    )
    assert approved.status_code == 200, approved.text
    intake = client.post(
        f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/intake",
        headers={"Authorization": "Bearer ops-secret"},
        json={"emails": ["pilot.a@example.com", "pilot.b@example.com"]},
    )
    assert intake.status_code == 200
    assert intake.json()["added"] == 2
    pack = client.post(
        f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/invitation-packs",
        headers={"Authorization": "Bearer ops-secret"},
        json={},
    )
    assert pack.status_code == 200
    return cid, pack.json()["invitation_pack"]["id"]


def test_hardening_status_and_phase2_on_control_plane(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        hard = client.get(
            "/api/v1/admin/pilot-os/candidate-first/hardening",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert hard.status_code == 200
        body = hard.json()
        assert body["open_critical_high"] == 0
        assert body["company_approval_is_top_blocker"] is False
        assert body["alten_org_pack"] == "NOT_PREPARED"
        assert body["phase_3_not_started"] is True
        assert any(g["id"] == "CF-H01" for g in body["closed_gaps"])

        status = client.get(
            "/api/v1/admin/pilot-os/candidate-first",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert status.status_code == 200
        plane = status.json()
        assert plane["phase2_status"] == "PRODUCTION_HARDENED"
        assert plane["scorecard"]["production_hardened"] is True
        assert plane["company_approval_is_top_blocker"] is False
        assert "PRODUCTION-HARDENED" in plane["hardening_verdict"]
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_send_dry_run_does_not_mint_or_send(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        _, pack_id = _approved_pack(client)
        dry = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/invitation-packs/{pack_id}/send",
            headers={"Authorization": "Bearer ops-secret"},
            json={"dry_run": True, "founder_send_approval_ref": "FOUNDER-SEND-AUTH-OK"},
        )
        assert dry.status_code == 200
        body = dry.json()
        assert body["dry_run"] is True
        assert body["send_executed"] is False
        assert body["tokens_minted"] == 0
        assert db.query(CandidateInviteToken).count() == 0
        pack = db.query(CandidatePilotInvitationPack).filter_by(id=pack_id).one()
        assert pack.status == "READY_UNSENT"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_send_blocked_without_ref_even_when_not_dry_run(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        _, pack_id = _approved_pack(client)
        blocked = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/invitation-packs/{pack_id}/send",
            headers={"Authorization": "Bearer ops-secret"},
            json={"dry_run": False, "founder_send_approval_ref": "short"},
        )
        assert blocked.status_code == 403
        assert db.query(CandidateInviteToken).count() == 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_authorized_send_blocked_by_epic_210_runtime_and_caps(monkeypatch) -> None:
    """Epic 2.10: Founder send ref alone cannot mint — runtime + effective cap 0."""
    client, db, app, get_settings = _client(monkeypatch)
    try:
        _, pack_id = _approved_pack(client)
        sent = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/invitation-packs/{pack_id}/send",
            headers={"Authorization": "Bearer ops-secret"},
            json={"dry_run": False, "founder_send_approval_ref": "FOUNDER-SEND-AUTH-OK"},
        )
        assert sent.status_code in (200, 403), sent.text
        body = sent.json()
        assert body.get("send_executed") is not True
        assert db.query(CandidateInviteToken).count() == 0
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_cv_magic_rejects_mismatched_extension() -> None:
    try:
        assert_cv_content_matches_extension(b"%PDF-1.4 fake", "cv.docx")
        raise AssertionError("expected mismatch")
    except CvParseError:
        pass
    assert_cv_content_matches_extension(b"%PDF-1.4 content", "cv.pdf")


def test_ai_kill_switch_skips_claude(monkeypatch) -> None:
    monkeypatch.setenv("AI_INTEL_KILL_SWITCH", "true")
    from app.services.ai_intel_validation import kill_switch_engaged
    from app.services.candidate_intelligence import _claude_extract

    assert kill_switch_engaged() is True
    assert _claude_extract("Senior engineer Python FastAPI experience years") is None


def test_hardening_checklist_alembic_106() -> None:
    steps = cfp.synthetic_candidate_e2e_checklist()["steps"]
    names = {s["name"] for s in steps}
    assert "alembic_106_phase2" in names
    assert "phase2_hardening_status" in names
    assert "send_dry_run_no_execute" in names
