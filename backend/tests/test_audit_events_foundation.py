"""Audit event foundation — append-only API tests (11 assertions)."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import AuditEvent, Base, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def audit_client() -> Iterator[tuple[TestClient, Session]]:
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
        email="audit-foundation@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}


def test_1_model_and_api_exist(audit_client: tuple[TestClient, Session]) -> None:
    client, _db = audit_client
    assert AuditEvent.__tablename__ == "audit_events"
    res = client.get("/api/v1/audit-events")
    assert res.status_code == 401


def test_2_post_creates_audit_event(audit_client: tuple[TestClient, Session]) -> None:
    client, db = audit_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "foundation_demo",
            "actor_persona": "board",
            "target_type": "demo_target",
            "target_id": "demo-001",
            "metadata": {"scope": "foundation", "preview": "true"},
        },
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["event_type"] == "foundation_demo"
    assert body["id"] > 0


def test_3_get_returns_created_event(audit_client: tuple[TestClient, Session]) -> None:
    client, db = audit_client
    headers = _auth_headers(db)
    client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "foundation_demo",
            "actor_persona": "recruiter",
            "target_type": "demo_target",
            "target_id": "demo-002",
        },
        headers=headers,
    )
    res = client.get("/api/v1/audit-events?target_id=demo-002", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    assert items[0]["target_id"] == "demo-002"


def test_4_no_update_route(audit_client: tuple[TestClient, Session]) -> None:
    client, _db = audit_client
    assert client.put("/api/v1/audit-events/1").status_code in {401, 404, 405}
    assert client.patch("/api/v1/audit-events/1").status_code in {401, 404, 405}


def test_5_no_delete_route(audit_client: tuple[TestClient, Session]) -> None:
    client, _db = audit_client
    assert client.delete("/api/v1/audit-events/1").status_code in {401, 404, 405}


def test_6_external_side_effect_false(audit_client: tuple[TestClient, Session]) -> None:
    client, db = audit_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "record_created",
            "actor_persona": "company",
            "target_type": "work_item",
            "target_id": "wi-1",
        },
        headers=headers,
    )
    assert res.json()["external_side_effect"] is False


def test_7_no_email_ats_outreach_in_response(audit_client: tuple[TestClient, Session]) -> None:
    client, db = audit_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "foundation_demo",
            "actor_persona": "board",
            "target_type": "demo_target",
            "target_id": "demo-003",
            "metadata": {"email": "secret@x.com", "scope": "safe", "ats": "sync"},
        },
        headers=headers,
    )
    assert "secret@x.com" not in res.text.lower()
    assert res.json()["metadata"] == {"scope": "safe"}


def test_8_invalid_payload_rejected(audit_client: tuple[TestClient, Session]) -> None:
    client, db = audit_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "not_allowed_type",
            "actor_persona": "board",
            "target_type": "demo_target",
            "target_id": "x",
        },
        headers=headers,
    )
    assert res.status_code == 400


def test_9_auth_guard_on_writes(audit_client: tuple[TestClient, Session]) -> None:
    client, _db = audit_client
    res = client.post(
        "/api/v1/audit-events",
        json={
            "event_type": "foundation_demo",
            "actor_persona": "board",
            "target_type": "demo_target",
            "target_id": "unauth",
        },
    )
    assert res.status_code == 401
    assert client.get("/api/v1/audit-events").status_code == 401
