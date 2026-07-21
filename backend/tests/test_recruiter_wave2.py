"""Recruiter Wave 2 — Hard LIVE evidence + decision memory + invite dry-run tests."""

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
from app.services import recruiter_wave2 as wave2
from app.services.recruiter_jobs import archive_company_job, create_company_job, update_company_job


@pytest.fixture
def wave2_client() -> Iterator[tuple[TestClient, Session]]:
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
        email="wave2-ops@twin.internal",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.email)}"}


def _recruiter_headers(slug: str = "wave2-smoke-co") -> dict[str, str]:
    token = mint_recruiter_session_jwt(slug, expires_minutes=30)
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_wave2_status_requires_auth(wave2_client: tuple[TestClient, Session]) -> None:
    client, _db = wave2_client
    assert client.get("/api/v1/platform/wave2/status").status_code == 401


def test_wave2_status_and_evidence_seed(wave2_client: tuple[TestClient, Session]) -> None:
    client, db = wave2_client
    headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave2/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["ats_live_sync"] == "BLOCKED"
    assert body["microsoft_write"] == "BLOCKED"
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["evidence"]["pending_smoke"] >= 1
    assert body["evidence"]["held_policy"] >= 1
    assert body["evidence"]["demo_only"] >= 1


def test_demo_fixture_rejected_in_decision_memory(wave2_client: tuple[TestClient, Session]) -> None:
    client, _db = wave2_client
    headers = _recruiter_headers()
    bad = client.post(
        "/api/v1/recruiter/decision-memory",
        headers=headers,
        json={
            "subject_type": "candidate",
            "subject_id": "demo-candidate-001",
            "decision_code": "advance",
            "summary": "Should fail",
        },
    )
    assert bad.status_code == 400
    assert "demo_fixture" in bad.json()["detail"]


def test_decision_memory_live_roundtrip(wave2_client: tuple[TestClient, Session]) -> None:
    client, _db = wave2_client
    headers = _recruiter_headers()
    created = client.post(
        "/api/v1/recruiter/decision-memory",
        headers=headers,
        json={
            "subject_type": "candidate",
            "subject_id": "cand-synth-42",
            "decision_code": "advance",
            "summary": "Strong systems bar",
            "rationale_code": "skills_match",
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["demo_fixture"] is False
    assert body["source"] == "live"
    listed = client.get("/api/v1/recruiter/decision-memory", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1


def test_team_invite_dry_run_no_send(wave2_client: tuple[TestClient, Session]) -> None:
    client, _db = wave2_client
    headers = _recruiter_headers()
    res = client.post(
        "/api/v1/recruiter/team/invites/dry-run",
        headers=headers,
        json={"invitee_email": "smoke-invite@twin.internal", "role_key": "recruiter"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["email_sent"] is False
    assert body["dry_run"] is True
    assert body["outbox_status"] == "draft"
    assert body["enrollment_enabled"] is False


def test_comms_send_forbidden(wave2_client: tuple[TestClient, Session]) -> None:
    client, _db = wave2_client
    headers = _recruiter_headers()
    res = client.post(
        "/api/v1/recruiter/communications/draft",
        headers=headers,
        json={
            "subject_id": "cand-synth-9",
            "body_preview": "Hello",
            "send": True,
        },
    )
    assert res.status_code == 400
    draft = client.post(
        "/api/v1/recruiter/communications/draft",
        headers=headers,
        json={
            "subject_id": "cand-synth-9",
            "body_preview": "Hello draft only",
            "send": False,
        },
    )
    assert draft.status_code == 201
    assert draft.json()["email_sent"] is False


def test_job_lifecycle_archive(wave2_client: tuple[TestClient, Session]) -> None:
    _client, db = wave2_client
    created = create_company_job(
        db,
        company_slug="wave2-smoke-co",
        title="Backend Engineer",
        location="Remote",
        description="Wave 2 job",
        url=None,
        salary_min=10000,
        salary_max=20000,
    )
    assert created["role_status"] == "published"
    updated = update_company_job(
        db,
        company_slug="wave2-smoke-co",
        job_id=created["id"],
        title="Backend Engineer II",
    )
    assert updated["title"] == "Backend Engineer II"
    archived = archive_company_job(db, company_slug="wave2-smoke-co", job_id=created["id"])
    assert archived["role_status"] == "archived"
    assert archived["is_validated"] is False


def test_policy_held_cannot_pass(wave2_client: tuple[TestClient, Session]) -> None:
    client, db = wave2_client
    headers = _auth_user(db)
    client.get("/api/v1/platform/wave2/status", headers=headers)
    res = client.post(
        "/api/v1/platform/wave2/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "recruiter_calendar",
            "status": "PASS",
            "smoke_sha": "abc123",
        },
    )
    assert res.status_code == 422
    demo = client.post(
        "/api/v1/platform/wave2/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "recruiter_demo_pipeline",
            "status": "PASS",
            "smoke_sha": "abc123",
        },
    )
    assert demo.status_code == 422


def test_seed_counts() -> None:
    assert len(wave2.WAVE2_SMOKEABLE_MODULES) >= 15
    assert len(wave2.WAVE2_HELD_MODULES) >= 5
    assert len(wave2.WAVE2_DEMO_ONLY_MODULES) >= 8
