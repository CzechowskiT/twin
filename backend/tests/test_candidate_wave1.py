"""Candidate Wave 1 — live trust bundle + Hard LIVE evidence tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.core.security import create_access_token
from app.database.models import Base, Candidate, User
from app.main import app
from app.services import candidate_wave1 as wave1


@pytest.fixture
def wave1_client() -> Iterator[tuple[TestClient, Session]]:
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


def _auth_candidate(db: Session) -> dict[str, str]:
    user = User(
        email="wave1-smoke@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
        email_product_updates=False,
        email_interview_reminders=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    candidate = Candidate(user_id=user.id, name="Wave1 Smoke", skills="[]", preferred_job_titles="[]")
    db.add(candidate)
    db.commit()
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}


def test_wave1_status_requires_auth(wave1_client: tuple[TestClient, Session]) -> None:
    client, _db = wave1_client
    assert client.get("/api/v1/platform/wave1/status").status_code == 401


def test_wave1_status_and_evidence_seed(wave1_client: tuple[TestClient, Session]) -> None:
    client, db = wave1_client
    headers = _auth_candidate(db)
    res = client.get("/api/v1/platform/wave1/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["auto_apply"] == "PAUSED"
    assert body["microsoft_write"] == "BLOCKED"
    assert body["evidence"]["pending_smoke"] >= 1
    assert body["evidence"]["held_policy"] >= 1

    ev = client.get("/api/v1/platform/wave1/hard-live/evidence", headers=headers)
    assert ev.status_code == 200
    items = ev.json()["items"]
    ids = {i["module_id"] for i in items}
    assert "candidate_consent_receipt" in ids
    assert "auto_apply" in ids
    auto = next(i for i in items if i["module_id"] == "auto_apply")
    assert auto["status"] == "HELD_POLICY"


def test_live_bundle_and_timeline_no_demo(wave1_client: tuple[TestClient, Session]) -> None:
    client, db = wave1_client
    headers = _auth_candidate(db)
    assert client.get("/api/v1/candidates/me/trust/live-bundle").status_code == 401
    bundle = client.get("/api/v1/candidates/me/trust/live-bundle", headers=headers)
    assert bundle.status_code == 200
    data = bundle.json()
    assert data["source"] == "live"
    assert data["demo_fixture"] is False
    assert data["live_claim"] is False
    assert "consent_receipts" in data
    assert data["calendar"]["microsoft_write_blocked"] is True
    assert "demo-candidate-001" not in str(data)

    timeline = client.get("/api/v1/candidates/me/trust/activity-timeline", headers=headers)
    assert timeline.status_code == 200
    assert timeline.json()["api_alias_of"] == "/candidates/me/trust/audit-events"


def test_privacy_request_idempotent_via_existing_api(wave1_client: tuple[TestClient, Session]) -> None:
    client, db = wave1_client
    headers = _auth_candidate(db)
    payload = {
        "request_type": "correction",
        "payload": {"field": "skills", "note": "wave1"},
        "idempotency_key": "wave1-corr-1",
    }
    first = client.post("/api/v1/candidates/me/privacy-requests", headers=headers, json=payload)
    assert first.status_code == 201
    second = client.post("/api/v1/candidates/me/privacy-requests", headers=headers, json=payload)
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_mark_evidence_partial(wave1_client: tuple[TestClient, Session]) -> None:
    client, db = wave1_client
    headers = _auth_candidate(db)
    wave1.seed_wave1_flags_and_evidence(db)
    marked = client.post(
        "/api/v1/platform/wave1/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "candidate_consent_receipt",
            "status": "PARTIAL",
            "smoke_sha": "abc123",
            "notes": "unit test mark",
        },
    )
    assert marked.status_code == 200
    assert marked.json()["status"] == "PARTIAL"
    assert marked.json()["smoke_sha"] == "abc123"
