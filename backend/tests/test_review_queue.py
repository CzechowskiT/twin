"""Review queue tests."""

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
def rq_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    yield TestClient(app), db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="rq@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get_queue(rq_client):
    c, db = rq_client
    assert c.get("/api/v1/review-queue", headers=_h(db)).status_code == 200


def test_post_item(rq_client):
    c, db = rq_client
    r = c.post("/api/v1/review-queue", json={"item_kind": "trust_audit_review", "subject_ref": "demo-1"}, headers=_h(db))
    assert r.status_code == 201


def test_patch_status(rq_client):
    c, db = rq_client
    h = _h(db)
    iid = c.post("/api/v1/review-queue", json={"item_kind": "consent_receipt_review", "subject_ref": "d2"}, headers=h).json()["id"]
    assert c.patch(f"/api/v1/review-queue/{iid}", json={"status": "in_review"}, headers=h).json()["status"] == "in_review"


def test_no_delete(rq_client):
    c, _ = rq_client
    assert c.delete("/api/v1/review-queue/1").status_code in {401, 404, 405}


def test_no_approve_route(rq_client):
    c, db = rq_client
    assert c.post("/api/v1/review-queue/1/approve", headers=_h(db)).status_code in {404, 405}


def test_audit(rq_client):
    c, db = rq_client
    c.post("/api/v1/review-queue", json={"item_kind": "correction_draft", "subject_ref": "d3"}, headers=_h(db))
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "review_queue_item").count() >= 1
