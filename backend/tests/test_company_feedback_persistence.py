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
def cf_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    yield TestClient(app), db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="cf@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get(cf_client):
    c, db = cf_client
    assert c.get("/api/v1/company-feedback", headers=_h(db)).status_code == 200


def test_post(cf_client):
    c, db = cf_client
    assert c.post("/api/v1/company-feedback", json={"candidate_ref": "c1", "role_ref": "r1"}, headers=_h(db)).status_code == 201


def test_patch(cf_client):
    c, db = cf_client
    h = _h(db)
    iid = c.post("/api/v1/company-feedback", json={"candidate_ref": "c2", "role_ref": "r2"}, headers=h).json()["id"]
    assert c.patch(f"/api/v1/company-feedback/{iid}", json={"status": "submitted_for_review"}, headers=h).json()["status"] == "submitted_for_review"


def test_no_delete(cf_client):
    c, _ = cf_client
    assert c.delete("/api/v1/company-feedback/1").status_code in {401, 404, 405}


def test_audit(cf_client):
    c, db = cf_client
    c.post("/api/v1/company-feedback", json={"candidate_ref": "c3", "role_ref": "r3"}, headers=_h(db))
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "company_feedback").count() >= 1
