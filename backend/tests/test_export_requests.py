"""Export request endpoint tests."""

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
def er_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    yield TestClient(app), db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="er@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get_export_requests(er_client):
    c, db = er_client
    assert c.get("/api/v1/export-requests", headers=_h(db)).status_code == 200


def test_post_export_request(er_client):
    c, db = er_client
    r = c.post(
        "/api/v1/export-requests",
        json={"request_type": "candidate_export_preview", "candidate_id": "demo-candidate-001"},
        headers=_h(db),
    )
    assert r.status_code == 201
    assert r.json()["legal_claim"] is False


def test_post_export_intake_queued(er_client):
    c, db = er_client
    r = c.post(
        "/api/v1/export-requests",
        json={
            "request_type": "candidate_export_intake",
            "candidate_id": "smoke-candidate",
            "status": "queued_for_ops_intake",
        },
        headers=_h(db),
    )
    assert r.status_code == 201
    assert r.json()["status"] == "queued_for_ops_intake"
    assert r.json()["legal_claim"] is False


def test_reject_forbidden_status(er_client):
    c, db = er_client
    r = c.post(
        "/api/v1/export-requests",
        json={"request_type": "trust_audit_preview", "candidate_id": "x", "status": "fulfilled"},
        headers=_h(db),
    )
    assert r.status_code == 400


def test_no_patch(er_client):
    c, db = er_client
    assert c.patch("/api/v1/export-requests/1", json={}, headers=_h(db)).status_code in {404, 405}


def test_no_delete(er_client):
    c, _ = er_client
    assert c.delete("/api/v1/export-requests/1").status_code in {401, 404, 405}


def test_audit_on_post(er_client):
    c, db = er_client
    c.post(
        "/api/v1/export-requests",
        json={"request_type": "consent_receipt_preview", "candidate_id": "demo-1"},
        headers=_h(db),
    )
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "export_request").count() >= 1
