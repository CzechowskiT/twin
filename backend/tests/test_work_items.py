"""Work items persistence tests."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import AuditEvent, Base, User, WorkItem
from app.database.session import get_db
from app.main import app


@pytest.fixture
def work_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
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


def _headers(db: Session) -> dict[str, str]:
    user = User(email="wi@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.email)}"}


def test_get_works(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    assert client.get("/api/v1/work-items", headers=_headers(db)).status_code == 200


def test_post_creates_note(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    res = client.post(
        "/api/v1/work-items",
        json={"item_type": "note", "title": "Follow up", "persona_scope": "recruiter"},
        headers=_headers(db),
    )
    assert res.status_code == 201
    assert res.json()["item_type"] == "note"


def test_post_creates_task(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    res = client.post(
        "/api/v1/work-items",
        json={"item_type": "task", "title": "Review CV", "persona_scope": "recruiter", "status": "open"},
        headers=_headers(db),
    )
    assert res.status_code == 201


def test_patch_status(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    headers = _headers(db)
    created = client.post(
        "/api/v1/work-items",
        json={"item_type": "task", "title": "T", "persona_scope": "recruiter"},
        headers=headers,
    ).json()
    res = client.patch(f"/api/v1/work-items/{created['id']}", json={"status": "in_progress"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"


def test_no_delete(work_client: tuple[TestClient, Session]) -> None:
    client, _db = work_client
    assert client.delete("/api/v1/work-items/1").status_code in {401, 404, 405}


def test_no_outbound_side_effect(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    res = client.post(
        "/api/v1/work-items",
        json={"item_type": "note", "title": "N", "persona_scope": "company"},
        headers=_headers(db),
    )
    assert res.json()["external_side_effect"] is False


def test_audit_event_created(work_client: tuple[TestClient, Session]) -> None:
    client, db = work_client
    client.post(
        "/api/v1/work-items",
        json={"item_type": "task", "title": "Audit", "persona_scope": "recruiter"},
        headers=_headers(db),
    )
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "work_item").count() >= 1


def test_auth_required(work_client: tuple[TestClient, Session]) -> None:
    client, _db = work_client
    assert client.post("/api/v1/work-items", json={"item_type": "note", "title": "x", "persona_scope": "recruiter"}).status_code == 401


def test_model_exists(work_client: tuple[TestClient, Session]) -> None:
    _client, _db = work_client
    assert WorkItem.__tablename__ == "work_items"
