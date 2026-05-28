"""Verified candidate readiness gate endpoint coverage."""

from datetime import datetime, timezone
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Base, Candidate, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def readiness_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(
        email="verified-gate@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()

    candidate = Candidate(
        user_id=user.id,
        name="Candidate",
        cv_text="CV body",
        cv_processing_consent_at=datetime.now(timezone.utc),
        profile_signals_json=json.dumps(
            {
                "career_compass": {"ideal": {"job_title": "Backend Engineer"}},
                "cv_insights": {"summary": "Strong Python profile"},
            }
        ),
    )
    db.add(candidate)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}

    yield client, headers, db, user, candidate

    app.dependency_overrides.clear()
    db.close()


def test_verified_readiness_happy_path(readiness_client) -> None:
    client, headers, _db, _user, _candidate = readiness_client
    res = client.get("/api/v1/candidates/me/verified-readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["verification_status"] == "verified_basic"
    assert body["delegated_apply_allowed"] is False
    assert body["can_prepare_application_package"] is True
    assert body["can_submit_delegated_application"] is False
    assert body["missing_items"] == []


def test_verified_readiness_missing_career_brief(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    candidate.profile_signals_json = json.dumps({"cv_insights": {"summary": "Only evidence"}})
    db.add(candidate)
    db.commit()

    res = client.get("/api/v1/candidates/me/verified-readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["verification_status"] == "career_brief_missing"
    assert "career_brief" in body["missing_items"]
    assert "missing_career_brief" in body["blocked_reasons"]


def test_verified_readiness_missing_consent(readiness_client) -> None:
    client, headers, db, user, candidate = readiness_client
    user.gdpr_consent_at = None
    candidate.cv_processing_consent_at = None
    db.add(user)
    db.add(candidate)
    db.commit()

    res = client.get("/api/v1/candidates/me/verified-readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["verification_status"] == "consent_missing"
    assert body["checklist"]["consent_general_present"] is False
    assert body["checklist"]["consent_storage_present"] is False
    assert "missing_required_consent" in body["blocked_reasons"]
