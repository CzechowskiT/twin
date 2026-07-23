"""Company Wave 3 — Hard LIVE evidence + org settings + scorecards + invite dry-run tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.core.recruiter_jwt import mint_recruiter_session_jwt
from app.core.security import create_access_token
from app.database.models import Base, User
from app.main import app
from app.services import company_wave3 as wave3


@pytest.fixture
def wave3_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _auth_user(db: Session) -> dict[str, str]:
    user = User(
        email="wave3-ops@twin.internal",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.email)}"}


def _company_headers(slug: str = "wave3-smoke-co") -> dict[str, str]:
    token = mint_recruiter_session_jwt(slug, expires_minutes=30)
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_wave3_status_requires_auth(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    assert client.get("/api/v1/platform/wave3/status").status_code == 401


def test_wave3_status_and_evidence_seed(wave3_client: tuple[TestClient, Session]) -> None:
    client, db = wave3_client
    headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave3/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["ats_live_sync"] == "BLOCKED"
    assert body["microsoft_write"] == "BLOCKED"
    assert body["stripe_public"] == "NOT_LIVE"
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["invite_delivery"] == "HELD"
    assert body["evidence"]["pending_smoke"] >= 1
    assert body["evidence"]["held_policy"] >= 1
    assert body["evidence"]["demo_only"] >= 1
    assert len(body["smokeable_module_ids"]) == len(wave3.WAVE3_SMOKEABLE_MODULES)


def test_demo_fixture_rejected_in_scorecards(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    bad = client.post(
        "/api/v1/company/scorecards",
        headers=headers,
        json={
            "subject_type": "candidate",
            "subject_id": "demo-candidate-001",
            "decision_code": "advance",
            "summary": "Should fail",
            "rating": 4,
        },
    )
    assert bad.status_code == 400
    assert "demo_fixture" in bad.json()["detail"]


def test_org_settings_and_scorecard_roundtrip(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    put = client.put(
        "/api/v1/company/org-settings",
        headers=headers,
        json={
            "display_name": "Wave3 Smoke Co",
            "timezone": "Europe/Warsaw",
            "locale": "en",
            "hiring_policy": {"bar": "high"},
            "updated_by_role": "company_admin",
        },
    )
    assert put.status_code == 200, put.text
    assert put.json()["persisted"] is True
    got = client.get("/api/v1/company/org-settings", headers=headers)
    assert got.status_code == 200
    assert got.json()["locale"] == "en"

    created = client.post(
        "/api/v1/company/scorecards",
        headers=headers,
        json={
            "subject_type": "candidate",
            "subject_id": "cand-synth-wave3",
            "decision_code": "advance",
            "summary": "Strong systems bar",
            "rating": 5,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["demo_fixture"] is False
    listed = client.get("/api/v1/company/scorecards", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1


def test_team_invite_dry_run_no_send(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    res = client.post(
        "/api/v1/company/team/invites/dry-run",
        headers=headers,
        json={"invitee_email": "smoke-hm@twin.internal", "role_key": "hiring_manager"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["email_sent"] is False
    assert body["dry_run"] is True
    assert body["invite_delivery"] == "HELD"
    assert body["enrollment_enabled"] is False
    assert body["worker_ready"] is True


def test_process_queued_invites_noop_when_enrollment_off(wave3_client: tuple[TestClient, Session]) -> None:
    from app.services import company_wave3 as wave3

    _client, db = wave3_client
    result = wave3.process_queued_company_invites(db, limit=5)
    assert result["processed"] == 0
    assert result["reason"] == "enrollment_off"
    assert result["invite_delivery"] == "HELD"


def test_notifications_send_forbidden(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    res = client.post(
        "/api/v1/company/notifications/draft",
        headers=headers,
        json={"body_preview": "Hello", "send": True},
    )
    assert res.status_code == 400
    draft = client.post(
        "/api/v1/company/notifications/draft",
        headers=headers,
        json={"body_preview": "Hello draft only", "send": False},
    )
    assert draft.status_code == 201
    assert draft.json()["email_sent"] is False


def test_permissions_matrix_and_onboarding(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    perms = client.get("/api/v1/company/permissions", headers=headers)
    assert perms.status_code == 200, perms.text
    body = perms.json()
    assert body["invite_delivery"] == "HELD"
    assert any(r["key"] == "hiring_manager" for r in body["roles"])
    onboarding = client.get("/api/v1/company/onboarding", headers=headers)
    assert onboarding.status_code == 200
    assert onboarding.json()["enrollment_enabled"] is False
    assert onboarding.json()["synthetic_only"] is True


def test_trust_summary_rejects_demo(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    bad = client.get(
        "/api/v1/company/trust-summary",
        headers=headers,
        params={"subject_id": "demo-candidate-001"},
    )
    assert bad.status_code == 400
    ok = client.get(
        "/api/v1/company/trust-summary",
        headers=headers,
        params={"subject_id": "cand-synth-9"},
    )
    assert ok.status_code == 200
    assert ok.json()["demo_fixture"] is False


def test_billing_and_integrations_honesty(wave3_client: tuple[TestClient, Session]) -> None:
    client, _db = wave3_client
    headers = _company_headers()
    billing = client.get("/api/v1/company/billing/honesty", headers=headers)
    assert billing.status_code == 200
    assert billing.json()["stripe_public"] == "NOT_LIVE"
    integ = client.get("/api/v1/company/integrations/honesty", headers=headers)
    assert integ.status_code == 200
    assert integ.json()["ats_live_sync"] == "BLOCKED"


def test_policy_held_cannot_pass(wave3_client: tuple[TestClient, Session]) -> None:
    client, db = wave3_client
    headers = _auth_user(db)
    client.get("/api/v1/platform/wave3/status", headers=headers)
    res = client.post(
        "/api/v1/platform/wave3/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "company_integrations",
            "status": "PASS",
            "smoke_sha": "deadbeef",
        },
    )
    assert res.status_code == 422
    demo = client.post(
        "/api/v1/platform/wave3/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "company_demo_pipeline",
            "status": "PASS",
            "smoke_sha": "deadbeef",
        },
    )
    assert demo.status_code == 422
