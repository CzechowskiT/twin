"""Epic 2.9 — Product consolidation / private pilot readiness (INACTIVE)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import Candidate, ProductFunnelEvent, User
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _setup(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pilot-consolidation-test-secret-key-32!")
    monkeypatch.setenv("EXTERNAL_PILOT_ENROLLMENT_ENABLED", "false")
    monkeypatch.setenv("PRODUCT_FUNNEL_EVENTS_ENABLED", "true")
    monkeypatch.setenv("MICROSOFT_CALENDAR_WRITE_ENABLED", "false")
    from app.config import get_settings
    from app.core.deps import get_current_user

    get_settings.cache_clear()
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (User.__table__, Candidate.__table__, ProductFunnelEvent.__table__):
        table.create(bind=bind, checkfirst=True)

    user = User(
        email="pilot29@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Pilot29",
        skills='["Python"]',
        experience_years=3,
        cv_text="Engineer",
    )
    db.add(cand)
    db.commit()

    app = create_app()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app), db, user


def test_pilot_consolidation_aggregate_and_gates(monkeypatch):
    client, db, user = _setup(monkeypatch)

    agg = client.get("/api/v1/candidates/me/pilot-consolidation")
    assert agg.status_code == 200, agg.text
    body = agg.json()
    assert body["schema"] == "twin.pilot_consolidation/v1"
    assert body["pilot_access"]["pilot_access_status"] == "OPERATIONALLY_READY_INACTIVE"
    assert body["pilot_access"]["enrollment_enabled"] is False
    assert body["pilot_access"]["invite_send_enabled"] is False
    assert body["pilot_access"]["real_invites_sent"] == 0
    assert body["pilot_access"]["real_pilot_users_added"] == 0
    assert body["pilot_access"]["launch"] == "NO-GO"
    assert body["safety"]["new_intelligence_module"] is False
    assert body["safety"]["microsoft_calendar_write"] is False
    assert body["ia"]["jargon_in_primary"] is False
    assert len(body["ia"]["primary"]) == 7
    assert body["first_value"]["id"] == "pilot_first_value_v1"
    assert "sign_in_alone" in body["first_value"]["not_sufficient"]

    fv = client.get("/api/v1/candidates/me/pilot-consolidation/first-value")
    assert fv.status_code == 200
    assert fv.json()["routes"]["home"] == "/dashboard"
    assert fv.json()["routes"]["daily_os_api"] == "/api/v1/candidates/me/career-copilot/daily"

    access = client.get("/api/v1/candidates/me/pilot-consolidation/pilot-access")
    assert access.status_code == 200
    assert access.json()["invite_send_enabled"] is False

    tel = client.post(
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        json={"event_name": "pilot_first_value_reached", "properties": {"surface": "test"}},
    )
    assert tel.status_code == 200, tel.text
    assert tel.json()["ok"] is True
    assert tel.json()["kpi_excluded"] is True

    banned = client.post(
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        json={"event_name": "not_a_real_event", "properties": {"cv_text": "secret"}},
    )
    assert banned.status_code == 400

    # PII keys stripped — event still stores without cv
    tel2 = client.post(
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        json={
            "event_name": "pilot_home_opened",
            "properties": {"cv_text": "SHOULD_NOT_STORE", "surface": "home"},
        },
    )
    assert tel2.status_code == 200
    row = (
        db.query(ProductFunnelEvent)
        .filter(ProductFunnelEvent.user_id == user.id, ProductFunnelEvent.event_name == "pilot_home_opened")
        .order_by(ProductFunnelEvent.id.desc())
        .first()
    )
    assert row is not None
    assert "SHOULD_NOT_STORE" not in (row.properties_json or "")
