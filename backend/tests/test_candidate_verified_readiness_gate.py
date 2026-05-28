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

FORBIDDEN_RESPONSE_SUBSTRINGS = (
    "postgresql://",
    "SECRET_KEY",
    "sk_live_",
    "sk_test_",
    "whsec_",
    "JWT_SECRET",
    "google_client_secret",
    "Traceback (most recent call last)",
)


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


def _get_gate(client: TestClient, headers: dict[str, str]) -> dict:
    res = client.get("/api/v1/candidates/me/verified-readiness", headers=headers)
    assert res.status_code == 200
    return res.json()


def _assert_delegated_apply_blocked(body: dict) -> None:
    assert body["delegated_apply_allowed"] is False
    assert body["can_submit_delegated_application"] is False


def test_verified_readiness_ready_for_review_when_complete_without_marker(readiness_client) -> None:
    client, headers, _db, _user, _candidate = readiness_client
    body = _get_gate(client, headers)
    assert body["verification_status"] == "ready_for_review"
    assert body["can_prepare_application_package"] is True
    _assert_delegated_apply_blocked(body)
    assert body["missing_items"] == []


def test_verified_readiness_verified_basic_with_gateway_marker(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    signals = json.loads(candidate.profile_signals_json or "{}")
    signals["verified_gateway"] = {"basic_verified_at": "2026-05-28T10:00:00Z"}
    candidate.profile_signals_json = json.dumps(signals)
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "verified_basic"
    assert body["can_prepare_application_package"] is True
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_profile_incomplete(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    candidate.name = "   "
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "profile_incomplete"
    assert "profile" in body["missing_items"]
    assert body["can_prepare_application_package"] is False
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_cv_missing(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    candidate.cv_text = None
    candidate.cv_filename = None
    candidate.resume_path = None
    candidate.profile_signals_json = json.dumps(
        {
            "career_compass": {"ideal": {"job_title": "Backend Engineer"}},
            "cv_insights": {"summary": "Strong Python profile"},
        }
    )
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "cv_missing"
    assert "cv" in body["missing_items"]
    assert "missing_cv_material" in body["blocked_reasons"]
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_missing_career_brief(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    candidate.profile_signals_json = json.dumps({"cv_insights": {"summary": "Only evidence"}})
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "career_brief_missing"
    assert "career_brief" in body["missing_items"]
    assert "missing_career_brief" in body["blocked_reasons"]
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_skill_evidence_missing(readiness_client) -> None:
    client, headers, db, _user, candidate = readiness_client
    candidate.profile_signals_json = json.dumps(
        {"career_compass": {"ideal": {"job_title": "Backend Engineer"}}}
    )
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "skill_evidence_missing"
    assert "skill_evidence" in body["missing_items"]
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_missing_consent(readiness_client) -> None:
    client, headers, db, user, candidate = readiness_client
    user.gdpr_consent_at = None
    candidate.cv_processing_consent_at = None
    db.add(user)
    db.add(candidate)
    db.commit()

    body = _get_gate(client, headers)
    assert body["verification_status"] == "consent_missing"
    assert body["checklist"]["consent_general_present"] is False
    assert body["checklist"]["consent_storage_present"] is False
    assert "missing_required_consent" in body["blocked_reasons"]
    _assert_delegated_apply_blocked(body)


def test_verified_readiness_response_never_leaks_secrets(readiness_client) -> None:
    client, headers, _db, _user, _candidate = readiness_client
    res = client.get("/api/v1/candidates/me/verified-readiness", headers=headers)
    assert res.status_code == 200
    text = res.text.lower()
    for needle in FORBIDDEN_RESPONSE_SUBSTRINGS:
        assert needle.lower() not in text
