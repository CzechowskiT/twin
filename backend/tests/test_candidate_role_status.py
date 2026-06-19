"""Candidate role status tests."""

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
def crs_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="crs@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get_works(crs_client):
    c, db = crs_client
    assert c.get("/api/v1/candidate-role-status", headers=_h(db)).status_code == 200


def test_post_creates(crs_client):
    c, db = crs_client
    r = c.post("/api/v1/candidate-role-status", json={"candidate_ref": "c1", "role_ref": "r1", "status": "new"}, headers=_h(db))
    assert r.status_code == 201


def test_patch_status(crs_client):
    c, db = crs_client
    h = _h(db)
    rid = c.post("/api/v1/candidate-role-status", json={"candidate_ref": "c2", "role_ref": "r2", "status": "new"}, headers=h).json()["id"]
    assert c.patch(f"/api/v1/candidate-role-status/{rid}", json={"status": "reviewed"}, headers=h).json()["status"] == "reviewed"


def test_forbidden_status(crs_client):
    c, db = crs_client
    assert c.post("/api/v1/candidate-role-status", json={"candidate_ref": "c", "role_ref": "r", "status": "hired"}, headers=_h(db)).status_code == 400


def test_no_delete(crs_client):
    c, _ = crs_client
    assert c.delete("/api/v1/candidate-role-status/1").status_code in {401, 404, 405}


def test_audit_created(crs_client):
    c, db = crs_client
    c.post("/api/v1/candidate-role-status", json={"candidate_ref": "c3", "role_ref": "r3", "status": "shortlisted"}, headers=_h(db))
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "candidate_role").count() >= 1


def test_auth_required(crs_client):
    c, _ = crs_client
    assert c.post("/api/v1/candidate-role-status", json={"candidate_ref": "c", "role_ref": "r", "status": "new"}).status_code == 401
