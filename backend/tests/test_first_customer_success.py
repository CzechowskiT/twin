"""Unit tests for First Customer Success control plane — no invented real orgs."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.database.models import PilotInvitationPack, PilotOrganization, PilotSupportTicket
from app.database.session import get_db
from app.main import create_app
from app.services import first_customer_success as fcs
from tests.test_auth_integration import _sqlite_session


def _client(monkeypatch):
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
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


def test_control_plane_awaits_org(monkeypatch) -> None:
    client, db, app, get_settings = _client(monkeypatch)
    try:
        plane = fcs.build_control_plane(db)
        assert plane["verdict"] == fcs.VERDICT_AWAITING
        assert plane["kpi"]["token"] == "NO_REAL_PILOT_DATA"
        assert plane["progress"]["activated_recruiters"] == 0
        assert plane["success_criteria"]["all_met"] is False
        assert plane["time_to_value"]["median_hours"] is None
        assert "bias_free_ai" in plane["invitation_pack"]["forbidden_claims"]
        dry = fcs.synthetic_provisioning_dry_run()
        assert dry["provisioned_real_tenant"] is False
        assert dry["idempotency"] is True

        res = client.get(
            "/api/v1/admin/pilot-os/first-customer-success",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert res.status_code == 200, res.text
        assert "AWAITING FOUNDER-APPROVED" in res.json()["verdict"]

        ev = client.get(
            "/api/v1/admin/pilot-os/first-customer-success/evidence",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert ev.status_code == 200
        body = ev.json()
        assert body.get("kpi_token") == "NO_REAL_PILOT_DATA"
        assert body.get("privacy") == "no_cv_text_no_private_notes"
        assert body.get("org_slug") is None
        assert "resume_body" not in body

        status = client.get(
            "/api/v1/admin/pilot-os/status",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert status.status_code == 200
        assert "first_customer_success" in status.json()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_success_criteria_zeros_not_launch(monkeypatch) -> None:
    result = fcs.evaluate_success_criteria(fcs.empty_progress())
    assert result["all_met"] is False
    assert result["not_launch_go_evidence"] is True
    assert fcs.resolve_cs_verdict(
        approved_real=False, packs_sent=0, activated=0, milestone=False, validated=False
    ) == fcs.VERDICT_AWAITING
