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
        assert "AWAITING FIRST FOUNDER-APPROVED" in body["verdict"]
        assert body["stance"]["launch"] == "NO-GO"
        assert body["stance"]["enrollment"] == "OFF"
        assert body["kpi_token"] == "NO_REAL_PILOT_DATA"
        assert body["launch_go_gate"]["launch_decision"] == "NO-GO"
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
            )
            raise AssertionError("should reject synthetic")
        except ValueError as exc:
            assert "synthetic" in str(exc)
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
                "recipient_emails": ["r1@acme.test", "r2@acme.test", "r3@acme.test"],
            },
        )
        assert created.status_code == 200, created.text
        org_id = created.json()["organization"]["id"]
        approved = client.post(
            f"/api/v1/admin/pilot-os/organizations/{org_id}/approve",
            headers={"Authorization": "Bearer ops-secret"},
            json={"approved_by_label": "Tomasz Czechowski"},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["organization"]["approval_status"] == "FOUNDER_APPROVED"
        pack = client.post(
            f"/api/v1/admin/pilot-os/organizations/{org_id}/invitation-packs",
            headers={"Authorization": "Bearer ops-secret"},
            json={},
        )
        assert pack.status_code == 200, pack.text
        assert pack.json()["invitation_pack"]["status"] == "READY_UNSENT"
        assert pack.json()["invitation_pack"]["sent_at"] is None
        gate = client.get(
            "/api/v1/admin/pilot-os/launch-go-gate",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert gate.status_code == 200
        assert gate.json()["launch_decision"] == "NO-GO"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
