"""Request intake queue tests."""

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
def ri_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    yield TestClient(app), db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="ri@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get_intake(ri_client):
    c, db = ri_client
    assert c.get("/api/v1/request-intake", headers=_h(db)).status_code == 200


def test_post_intake(ri_client):
    c, db = ri_client
    r = c.post(
        "/api/v1/request-intake",
        json={"request_type": "correction_preview", "subject_ref": "field-1"},
        headers=_h(db),
    )
    assert r.status_code == 201


def test_patch_status(ri_client):
    c, db = ri_client
    h = _h(db)
    iid = c.post(
        "/api/v1/request-intake",
        json={"request_type": "trust_audit_review", "subject_ref": "audit-1"},
        headers=h,
    ).json()["id"]
    assert c.patch(f"/api/v1/request-intake/{iid}", json={"status": "triage"}, headers=h).json()["status"] == "triage"


def test_reject_forbidden_status(ri_client):
    c, db = ri_client
    r = c.post(
        "/api/v1/request-intake",
        json={"request_type": "portability_preview", "subject_ref": "p1", "status": "fulfilled"},
        headers=_h(db),
    )
    assert r.status_code == 400


def test_no_delete(ri_client):
    c, _ = ri_client
    assert c.delete("/api/v1/request-intake/1").status_code in {401, 404, 405}


def test_audit(ri_client):
    c, db = ri_client
    c.post(
        "/api/v1/request-intake",
        json={"request_type": "consent_receipt_review", "subject_ref": "c1"},
        headers=_h(db),
    )
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "request_intake_item").count() >= 1
