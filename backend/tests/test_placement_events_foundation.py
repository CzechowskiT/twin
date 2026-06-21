"""Placement events foundation — append-only API tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import AuditEvent, Base, PlacementEvent, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def pe_client() -> Iterator[tuple[TestClient, Session]]:
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
        email="placement-events@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    token = create_access_token(user.email)
    return {"Authorization": f"Bearer {token}"}


def test_unauth_returns_401(pe_client: tuple[TestClient, Session]) -> None:
    client, _db = pe_client
    assert client.get("/api/v1/placement-events").status_code == 401
    assert client.post("/api/v1/placement-events", json={}).status_code == 401


def test_post_creates_append_only_event(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-001",
            "event_type": "demo_verification_recorded",
            "event_status": "internal_only",
            "actor_persona": "board",
            "candidate_id": "demo-candidate-001",
            "metadata": {"scope": "foundation", "preview": "true"},
        },
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["event_type"] == "demo_verification_recorded"
    assert body["id"] > 0
    assert body["backend_write"] is True


def test_get_lists_events(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-002",
            "event_type": "evidence_collected",
            "event_status": "evidence_pending",
            "actor_persona": "recruiter",
        },
        headers=headers,
    )
    res = client.get("/api/v1/placement-events?placement_id=demo-placement-002", headers=headers)
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) >= 1
    assert items[0]["placement_id"] == "demo-placement-002"


def test_forbidden_event_type_rejected(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-bad",
            "event_type": "invoice_sent",
            "event_status": "internal_only",
            "actor_persona": "board",
        },
        headers=headers,
    )
    assert res.status_code == 400


def test_external_side_effect_always_false(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-003",
            "event_type": "verification_ready",
            "event_status": "ready_for_review",
            "actor_persona": "system",
        },
        headers=headers,
    )
    assert res.json()["external_side_effect"] is False


def test_no_delete_route(pe_client: tuple[TestClient, Session]) -> None:
    client, _db = pe_client
    assert client.delete("/api/v1/placement-events/1").status_code in {401, 404, 405}
    assert client.put("/api/v1/placement-events/1").status_code in {401, 404, 405}
    assert client.patch("/api/v1/placement-events/1").status_code in {401, 404, 405}


def test_audit_event_emitted(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-audit",
            "event_type": "internal_review_opened",
            "event_status": "ready_for_review",
            "actor_persona": "company",
        },
        headers=headers,
    )
    assert (
        db.query(AuditEvent)
        .filter(AuditEvent.target_type == "placement_verification_event")
        .count()
        >= 1
    )


def test_forbidden_metadata_stripped(pe_client: tuple[TestClient, Session]) -> None:
    client, db = pe_client
    headers = _auth_headers(db)
    res = client.post(
        "/api/v1/placement-events",
        json={
            "placement_id": "demo-placement-meta",
            "event_type": "board_evidence_reviewed",
            "event_status": "reviewed",
            "actor_persona": "board",
            "metadata": {"email": "secret@x.com", "scope": "safe", "payment": "true"},
        },
        headers=headers,
    )
    assert "secret@x.com" not in res.text.lower()
    assert res.json()["metadata"] == {"scope": "safe"}


def test_model_table_name(pe_client: tuple[TestClient, Session]) -> None:
    _client, _db = pe_client
    assert PlacementEvent.__tablename__ == "placement_events"
