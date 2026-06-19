"""Candidate visibility preference store tests."""

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
def vp_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    app.dependency_overrides[get_db] = lambda: (yield db)
    yield TestClient(app), db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _h(db: Session) -> dict[str, str]:
    u = User(email="vp@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    db.add(u)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(u.email)}"}


def test_get_preferences(vp_client):
    c, db = vp_client
    assert c.get("/api/v1/candidate-visibility-preferences", headers=_h(db)).status_code == 200


def test_post_preference(vp_client):
    c, db = vp_client
    r = c.post(
        "/api/v1/candidate-visibility-preferences",
        json={"candidate_id": "demo-candidate-001", "profile_visibility": "pilot_visible"},
        headers=_h(db),
    )
    assert r.status_code == 201
    assert r.json()["external_side_effect"] is False


def test_patch_preference(vp_client):
    c, db = vp_client
    h = _h(db)
    pid = c.post(
        "/api/v1/candidate-visibility-preferences",
        json={"candidate_id": "demo-candidate-002"},
        headers=h,
    ).json()["id"]
    r = c.patch(
        f"/api/v1/candidate-visibility-preferences/{pid}",
        json={"communication_preference": "draft_only"},
        headers=h,
    )
    assert r.json()["communication_preference"] == "draft_only"


def test_reject_invalid_value(vp_client):
    c, db = vp_client
    r = c.post(
        "/api/v1/candidate-visibility-preferences",
        json={"candidate_id": "x", "profile_visibility": "public"},
        headers=_h(db),
    )
    assert r.status_code == 400


def test_no_delete(vp_client):
    c, _ = vp_client
    assert c.delete("/api/v1/candidate-visibility-preferences/1").status_code in {401, 404, 405}


def test_audit_on_write(vp_client):
    c, db = vp_client
    c.post(
        "/api/v1/candidate-visibility-preferences",
        json={"candidate_id": "demo-candidate-003"},
        headers=_h(db),
    )
    assert db.query(AuditEvent).filter(AuditEvent.target_type == "visibility_preference").count() >= 1
