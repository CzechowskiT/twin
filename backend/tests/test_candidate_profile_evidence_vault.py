"""Candidate skill evidence vault API."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Base, Candidate, User
from app.database.session import get_db
from app.main import app
from app.services.candidate_evidence_vault import (
    create_candidate_evidence_item,
    delete_candidate_evidence_item,
    list_candidate_evidence_items,
)
from tests.test_auth_integration import _sqlite_session


def _seed_candidate(db) -> tuple[User, Candidate]:
    user = User(
        email="evidence@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Vault User", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    return user, cand


def test_evidence_service_crud() -> None:
    db = _sqlite_session()
    try:
        _, cand = _seed_candidate(db)
        empty = list_candidate_evidence_items(db, candidate_id=cand.id)
        assert empty["total"] == 0
        row = create_candidate_evidence_item(
            db,
            candidate_id=cand.id,
            skill_name="Python",
            evidence_type="project",
            title="API service",
            note="Built FastAPI microservice",
            source_url="https://github.com/example/repo",
        )
        assert row["skill_name"] == "Python"
        assert row["evidence_type"] == "project"
        listed = list_candidate_evidence_items(db, candidate_id=cand.id)
        assert listed["total"] == 1
        delete_candidate_evidence_item(db, candidate_id=cand.id, item_id=row["id"])
        assert list_candidate_evidence_items(db, candidate_id=cand.id)["total"] == 0
    finally:
        db.close()


def test_evidence_api_list_create_delete(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user, _cand = _seed_candidate(db)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == user.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    client = TestClient(app)
    try:
        r0 = client.get("/api/v1/candidates/me/evidence")
        assert r0.status_code == 200
        assert r0.json()["items"] == []

        r1 = client.post(
            "/api/v1/candidates/me/evidence",
            json={
                "skill_name": "TypeScript",
                "evidence_type": "certificate",
                "title": "Frontend cert",
            },
        )
        assert r1.status_code == 201
        item_id = r1.json()["id"]
        assert r1.json()["skill_name"] == "TypeScript"

        r_list = client.get("/api/v1/candidates/me/evidence")
        assert r_list.status_code == 200
        assert len(r_list.json()["items"]) == 1

        r_del = client.delete(f"/api/v1/candidates/me/evidence/{item_id}")
        assert r_del.status_code == 204
        assert client.get("/api/v1/candidates/me/evidence").json()["total"] == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
