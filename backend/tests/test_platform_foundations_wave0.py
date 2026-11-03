"""Platform foundations Wave 0 — persistence + enrollment gate tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.core.deps import get_db
from app.database.models import Base, FeatureFlagState, User
from app.main import app
from app.services import platform_foundations as foundations


@pytest.fixture
def foundations_client() -> Iterator[tuple[TestClient, Session]]:
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


def _auth_headers(db: Session) -> dict[str, str]:
    user = User(
        email="foundations-wave0@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}


def test_enrollment_gate_defaults_off(foundations_client: tuple[TestClient, Session]) -> None:
    client, db = foundations_client
    foundations.seed_system_roles(db)
    res = client.get("/api/v1/platform/foundations/enrollment-gate")
    assert res.status_code == 200
    body = res.json()
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["pilot"] == "BLOCKED_BY_FOUNDER"
    assert body["real_candidate_enrollment"] == "NOT_STARTED"


def test_status_requires_auth(foundations_client: tuple[TestClient, Session]) -> None:
    client, _db = foundations_client
    assert client.get("/api/v1/platform/foundations/status").status_code == 401


def test_status_seeds_roles_and_flags(foundations_client: tuple[TestClient, Session]) -> None:
    client, db = foundations_client
    headers = _auth_headers(db)
    res = client.get("/api/v1/platform/foundations/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["pillars"]["roles"] is True
    assert body["counts"]["roles"] >= 6
    assert body["external_pilot_enrollment_enabled"] is False


def test_privacy_case_and_domain_event(foundations_client: tuple[TestClient, Session]) -> None:
    client, db = foundations_client
    headers = _auth_headers(db)
    privacy = client.post(
        "/api/v1/platform/foundations/privacy-cases",
        headers=headers,
        json={"case_type": "export", "note": "wave0"},
    )
    assert privacy.status_code == 201
    assert privacy.json()["live_claim"] is False

    bad = client.post(
        "/api/v1/platform/foundations/domain-events",
        headers=headers,
        json={
            "event_name": "not_allowed.event",
            "aggregate_type": "user",
            "aggregate_id": "1",
        },
    )
    assert bad.status_code == 400

    ok = client.post(
        "/api/v1/platform/foundations/domain-events",
        headers=headers,
        json={
            "event_name": "foundation.smoke",
            "aggregate_type": "user",
            "aggregate_id": "1",
        },
    )
    assert ok.status_code == 201


def test_flag_flip_does_not_claim_enrollment_started(
    foundations_client: tuple[TestClient, Session],
) -> None:
    client, db = foundations_client
    foundations.seed_system_roles(db)
    row = (
        db.query(FeatureFlagState)
        .filter(FeatureFlagState.flag_key == "EXTERNAL_PILOT_ENROLLMENT_ENABLED")
        .one()
    )
    row.enabled = True
    db.commit()
    res = client.get("/api/v1/platform/foundations/enrollment-gate")
    body = res.json()
    assert body["external_pilot_enrollment_enabled"] is True
    # Canon enrollment counters stay NOT_STARTED until Founder program says otherwise
    assert body["real_candidate_enrollment"] == "NOT_STARTED"
