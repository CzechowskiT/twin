"""Candidate-first pilot control plane tests — no invented real candidates."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.database.models import (
    CandidatePilotCohort,
    CandidatePilotIntakeRow,
    CandidatePilotInvitationPack,
)
from app.database.session import get_db
from app.main import create_app
from app.services import candidate_first_pilot as cfp
from tests.test_auth_integration import _sqlite_session


def _client(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("EXTERNAL_PILOT_ENROLLMENT_ENABLED", "false")
    monkeypatch.setenv("PILOT_REGISTRATION_INVITE_ONLY", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        CandidatePilotCohort.__table__,
        CandidatePilotInvitationPack.__table__,
        CandidatePilotIntakeRow.__table__,
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


def test_control_plane_verdict_a_without_intake(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        plane = cfp.build_control_plane(db)
        assert plane["verdict"] == cfp.VERDICT_A
        assert plane["org_first_path"] == cfp.ORG_FIRST_SECONDARY
        assert plane["alten_org_pack"] == "NOT_PREPARED"
        assert plane["invites_sent"] == 0
        assert plane["packs_ready_unsent"] == 0
        assert plane["kpi"]["token"] == "NO_REAL_PILOT_DATA"
        assert plane["journey"]["blockers"] == []

        res = client.get(
            "/api/v1/admin/pilot-os/candidate-first",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert res.status_code == 200, res.text
        assert "CANDIDATE-FIRST PILOT READY" in res.json()["verdict"]

        e2e = client.get(
            "/api/v1/admin/pilot-os/candidate-first/synthetic-e2e",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert e2e.status_code == 200
        assert e2e.json()["total"] == 40
        assert e2e.json()["sends_mail"] is False
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_synthetic_cohort_cannot_approve(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        created = client.post(
            "/api/v1/admin/pilot-os/candidate-first/cohorts",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "slug": "synthetic-candidates",
                "display_name": "Synthetic",
                "is_synthetic": True,
            },
        )
        assert created.status_code == 200
        cid = created.json()["cohort"]["id"]
        denied = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/approve",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "approved_by_label": "Founder",
                "founder_cohort_approval_ref": "CAND-COHORT-APPROVAL-001",
                "data_processing_basis_ref": "DPA-CAND-001",
                "success_criteria_ref": "CF-SUCCESS-V1",
            },
        )
        assert denied.status_code == 400
        assert "synthetic" in denied.text.lower()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_prepare_pack_ready_unsent_send_safety_blocks_without_ref(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        created = client.post(
            "/api/v1/admin/pilot-os/candidate-first/cohorts",
            headers={"Authorization": "Bearer ops-secret"},
            json={"slug": "founding-candidates-pl", "display_name": "Founding Candidates PL"},
        )
        assert created.status_code == 200, created.text
        cid = created.json()["cohort"]["id"]
        approved = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/approve",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "approved_by_label": "Founder",
                "founder_cohort_approval_ref": "CAND-COHORT-APPROVAL-002",
                "data_processing_basis_ref": "DPA-CAND-002",
                "success_criteria_ref": "CF-SUCCESS-V1",
            },
        )
        assert approved.status_code == 200, approved.text

        # Pack without intake fails
        no_intake = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/invitation-packs",
            headers={"Authorization": "Bearer ops-secret"},
            json={},
        )
        assert no_intake.status_code == 400

        intake = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/intake",
            headers={"Authorization": "Bearer ops-secret"},
            json={"emails": ["cand1@example.test", "cand2@example.test"]},
        )
        assert intake.status_code == 200, intake.text
        assert intake.json()["added"] == 2

        pack = client.post(
            f"/api/v1/admin/pilot-os/candidate-first/cohorts/{cid}/invitation-packs",
            headers={"Authorization": "Bearer ops-secret"},
            json={},
        )
        assert pack.status_code == 200, pack.text
        body = pack.json()["invitation_pack"]
        assert body["status"] == "READY_UNSENT"
        assert body["sent_at"] is None
        assert body["recipient_count"] == 2
        assert all("***@" in m for m in body["recipients_masked"])
        assert pack.json()["send_executed"] is False

        safety = client.get(
            f"/api/v1/admin/pilot-os/candidate-first/invitation-packs/{body['id']}/send-safety",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert safety.status_code == 200
        gate = safety.json()
        assert gate["allowed"] is False
        assert "founder_send_approval_ref_required_at_send_time" in gate["blockers"]
        assert gate["send_executed"] is False
        assert gate["frozen"]["alten_org_pack"] == "NOT_PREPARED"

        status = client.get(
            "/api/v1/admin/pilot-os/status",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert status.status_code == 200
        assert status.json()["primary_product_validation"] == "candidate_first_pilot"
        assert "SECONDARY_B2B" in status.json()["org_first_path"]
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_bilingual_pack_has_no_false_claims() -> None:
    pack = cfp.bilingual_candidate_pack()
    assert "bias_free_ai" in pack["forbidden_claims"]
    assert pack["en"]["ai_disclosure"]
    assert pack["pl"]["draft_message"].startswith("SZKIC")
