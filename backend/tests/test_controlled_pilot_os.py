"""Unit tests for Controlled Pilot OS — no invented real orgs as seed truth."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.database.models import (
    PilotInvitationPack,
    PilotOrganization,
    PilotSupportTicket,
)
from app.database.session import get_db
from app.main import create_app
from app.services import controlled_pilot_os as pilot_os
from tests.test_auth_integration import _sqlite_session


def _client_with_db(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        PilotOrganization.__table__,
        PilotInvitationPack.__table__,
        PilotSupportTicket.__table__,
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


def test_os_status_awaits_org(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        res = client.get(
            "/api/v1/admin/pilot-os/status",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["verdict"] == pilot_os.ACTIVATION_APPROVAL_REQUIRED
        assert "APPROVAL REQUIRED" in body["verdict"]
        assert body["stance"]["launch"] == "NO-GO"
        assert body["stance"]["enrollment"] == "OFF"
        assert body["kpi_token"] == "NO_REAL_PILOT_DATA"
        assert body["launch_go_gate"]["launch_decision"] == "NO-GO"
        assert "first_customer" in body
        assert body["first_customer"]["launch_decision"] == "NO-GO"
        assert body["first_customer"]["pilot_health_score"] >= 70
        assert body["first_customer"]["launch_go_readiness_score"] < 50
        assert body["activation"]["approved_real_orgs"] == 0
        assert "founder_approved_real_organization" in body["activation"]["missing_inputs"]
        assert "founder_org_approval_ref" in body["activation"]["missing_inputs"]
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_synthetic_cannot_be_founder_approved(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        org = pilot_os.create_organization_candidate(
            db,
            slug="nova-hiring-pl",
            display_name="Nova Hiring PL",
            recipient_emails=["a@example.com"],
            is_synthetic=True,
        )
        assert org.is_synthetic is True
        try:
            pilot_os.founder_approve_organization(
                db,
                org_id=org.id,
                approved_by_label="Founder",
                recipient_emails=["a@example.com"],
                founder_org_approval_ref="FAKE-REF-SHOULD-NOT-MATTER",
                sponsor_label="Sponsor",
                legal_name="Nova Synthetic Sp. z o.o.",
            )
            raise AssertionError("should reject synthetic")
        except ValueError as exc:
            assert "synthetic" in str(exc)
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_approve_rejects_without_founder_org_ref(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        created = client.post(
            "/api/v1/admin/pilot-os/organizations",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "slug": "acme-pilot-pl",
                "display_name": "Acme Pilot PL",
                "recipient_emails": ["r1@acme.test"],
            },
        )
        assert created.status_code == 200, created.text
        org_id = created.json()["organization"]["id"]
        denied = client.post(
            f"/api/v1/admin/pilot-os/organizations/{org_id}/approve",
            headers={"Authorization": "Bearer ops-secret"},
            json={"approved_by_label": "Tomasz Czechowski"},
        )
        assert denied.status_code == 422
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_approve_prepare_pack_stays_unsent(monkeypatch) -> None:
    client, db, app, get_settings = _client_with_db(monkeypatch)
    try:
        created = client.post(
            "/api/v1/admin/pilot-os/organizations",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "slug": "acme-pilot-pl",
                "display_name": "Acme Pilot PL",
                "legal_name": "Acme Pilot Sp. z o.o.",
                "sponsor_label": "Founder Sponsor",
                "recipient_emails": ["r1@acme.test", "r2@acme.test", "r3@acme.test"],
            },
        )
        assert created.status_code == 200, created.text
        org_id = created.json()["organization"]["id"]
        approved = client.post(
            f"/api/v1/admin/pilot-os/organizations/{org_id}/approve",
            headers={"Authorization": "Bearer ops-secret"},
            json={
                "approved_by_label": "Tomasz Czechowski",
                "founder_org_approval_ref": "FOUNDER-ORG-APPROVAL-REF-001",
                "sponsor_label": "Founder Sponsor",
                "legal_name": "Acme Pilot Sp. z o.o.",
            },
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["organization"]["approval_status"] == "FOUNDER_APPROVED"
        assert approved.json()["organization"]["founder_org_approval_ref"]
        pack = client.post(
            f"/api/v1/admin/pilot-os/organizations/{org_id}/invitation-packs",
            headers={"Authorization": "Bearer ops-secret"},
            json={},
        )
        assert pack.status_code == 200, pack.text
        pack_body = pack.json()["invitation_pack"]
        assert pack_body["status"] == "READY_UNSENT"
        assert pack_body["sent_at"] is None
        pack_id = pack_body["id"]

        safety = client.get(
            f"/api/v1/admin/pilot-os/invitation-packs/{pack_id}/send-safety",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert safety.status_code == 200, safety.text
        gate = safety.json()
        assert gate["allowed"] is False
        assert "founder_send_approval_ref_required_at_send_time" in gate["blockers"]

        unauthorized = client.post(
            f"/api/v1/admin/pilot-os/invitation-packs/{pack_id}/send",
            headers={"Authorization": "Bearer ops-secret"},
            json={"founder_send_approval_ref": "short"},
        )
        assert unauthorized.status_code in {409, 422}

        status = client.get(
            "/api/v1/admin/pilot-os/status",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert status.status_code == 200
        assert status.json()["verdict"] == pilot_os.ACTIVATION_APPROVED_PACK_UNSENT

        gate_launch = client.get(
            "/api/v1/admin/pilot-os/launch-go-gate",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert gate_launch.status_code == 200
        assert gate_launch.json()["launch_decision"] == "NO-GO"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
