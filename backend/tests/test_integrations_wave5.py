"""Integrations Wave 5 — Hard LIVE evidence + inventory + ICS/webhook dry-run tests."""

from collections.abc import Iterator
from datetime import datetime, timezone
import hashlib
import hmac

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.core.security import create_access_token
from app.database.models import Base, User
from app.main import app
from app.services import integrations_wave5 as wave5
from app.services.ics_export import scheduled_interview_to_ics


@pytest.fixture
def wave5_client() -> Iterator[tuple[TestClient, Session]]:
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


def _auth_user(db: Session, *, excluded: bool = True) -> dict[str, str]:
    user = User(
        email="wave5-ops@twin.internal",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=excluded,
    )
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.email)}"}


def test_wave5_status_requires_auth(wave5_client: tuple[TestClient, Session]) -> None:
    client, _db = wave5_client
    assert client.get("/api/v1/platform/wave5/status").status_code == 401


def test_wave5_status_and_policy_holds(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave5/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["ats_live_sync"] == "BLOCKED"
    assert body["microsoft_write"] == "BLOCKED"
    assert body["stripe_public"] == "NOT_LIVE"
    assert body["authologic_kyc"] == "OFF"
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["auto_apply"] == "PAUSED"
    assert len(body["smokeable_module_ids"]) == 18
    assert "plat_ms_calendar_write" in body["held_module_ids"]
    assert "Wave 4" in body["wave4_note"]


def test_wave5_inventory_capability_split(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave5/integration-inventory", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "CONFIGURATION" in body["capability_keys"]
    assert "WRITE" in body["capability_keys"]
    google = body["integrations"]["google_calendar"]
    statuses = {c["capability"]: c["status"] for c in google}
    assert statuses["WRITE"] == "LIVE"
    assert statuses["WEBHOOK"] == "NOT_BUILT"
    ms = {c["capability"]: c["status"] for c in body["integrations"]["microsoft_calendar"]}
    assert ms["WRITE"] == "HELD_POLICY"
    ats = {c["capability"]: c["status"] for c in body["integrations"]["ats"]}
    assert ats["WRITE"] == "BLOCKED"
    assert ats["SYNC"] == "BLOCKED"


def test_wave5_held_module_cannot_pass(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    client.get("/api/v1/platform/wave5/status", headers=headers)
    res = client.post(
        "/api/v1/platform/wave5/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "plat_ms_calendar_write",
            "status": "PASS",
            "smoke_sha": "abc",
        },
    )
    assert res.status_code == 422


def test_wave5_ics_preview_cancel_and_publish(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    pub = client.post(
        "/api/v1/platform/wave5/ics/preview",
        headers=headers,
        json={"cancelled": False, "sequence": 0},
    )
    assert pub.status_code == 200
    pub_body = pub.json()
    assert pub_body["has_uid"] is True
    assert pub_body["provider_write"] is False
    assert "METHOD:PUBLISH" in pub_body["ics"]
    assert "STATUS:CONFIRMED" in pub_body["ics"]

    cancel = client.post(
        "/api/v1/platform/wave5/ics/preview",
        headers=headers,
        json={"cancelled": True, "sequence": 3},
    )
    assert cancel.status_code == 200
    cancel_body = cancel.json()
    assert cancel_body["has_cancel_method"] is True
    assert cancel_body["has_status_cancelled"] is True
    assert "SEQUENCE:3" in cancel_body["ics"]


def test_wave5_email_draft_forbids_send(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    bad = client.post(
        "/api/v1/platform/wave5/email/draft",
        headers=headers,
        json={"body_preview": "hello", "send": True},
    )
    assert bad.status_code == 400
    ok = client.post(
        "/api/v1/platform/wave5/email/draft",
        headers=headers,
        json={"body_preview": "hello", "send": False},
    )
    assert ok.status_code == 201
    assert ok.json()["draft"] is True
    assert ok.json()["provider_write"] is False


def test_wave5_webhook_verify_and_replay(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    secret = "wave5-test-secret"
    payload = '{"event":"hire"}'
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    first = client.post(
        "/api/v1/platform/wave5/webhook/verify-dry-run",
        headers=headers,
        json={
            "provider": "greenhouse",
            "payload": payload,
            "signature": sig,
            "secret": secret,
            "idempotency_key": "wave5-replay-1",
        },
    )
    assert first.status_code == 200
    assert first.json()["signature_ok"] is True
    assert first.json()["ats_write"] is False
    second = client.post(
        "/api/v1/platform/wave5/webhook/verify-dry-run",
        headers=headers,
        json={
            "provider": "greenhouse",
            "payload": payload,
            "signature": sig,
            "secret": secret,
            "idempotency_key": "wave5-replay-1",
        },
    )
    assert second.status_code == 200
    assert second.json()["replay_rejected"] is True


def test_wave5_csv_formula_escape(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db)
    res = client.post(
        "/api/v1/platform/wave5/csv/export-safe",
        headers=headers,
        json={"rows": [{"id": "1", "title": "=CMD()", "note": "+1"}]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["formula_cells_escaped"] == 2
    assert "'=CMD()" in body["csv"]


def test_wave5_webcal_mint_requires_metrics_exclusion(
    wave5_client: tuple[TestClient, Session],
) -> None:
    client, db = wave5_client
    headers = _auth_user(db, excluded=False)
    res = client.post("/api/v1/platform/wave5/webcal/mint", headers=headers)
    assert res.status_code == 403


def test_wave5_webcal_mint_ok(wave5_client: tuple[TestClient, Session]) -> None:
    client, db = wave5_client
    headers = _auth_user(db, excluded=True)
    res = client.post("/api/v1/platform/wave5/webcal/mint", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["provider_write"] is False
    assert "download_path" in body


def test_ics_export_sequence_and_cancel_unit() -> None:
    class Row:
        id = 42
        company_name = "Acme"
        job_title = "Eng"
        timezone = "Europe/Warsaw"
        interview_type = "video"
        meeting_link = "https://meet.example"
        meeting_location = None
        interview_start = datetime(2026, 9, 1, 12, 0, 0)
        interview_end = datetime(2026, 9, 1, 13, 0, 0)
        status = "scheduled"

    body = scheduled_interview_to_ics(Row(), cancelled=True, sequence=5)  # type: ignore[arg-type]
    assert "METHOD:CANCEL" in body
    assert "STATUS:CANCELLED" in body
    assert "SEQUENCE:5" in body
    assert "UID:twin-interview-42@twin" in body


def test_wave5_seed_counts(wave5_client: tuple[TestClient, Session]) -> None:
    _client, db = wave5_client
    created = wave5.seed_wave5_flags_and_evidence(db)
    assert created > 0
    evidence = wave5.list_hard_live_evidence(db)
    assert evidence["counts"]["pending_smoke"] == 18
    assert evidence["counts"]["held_policy"] == 12
