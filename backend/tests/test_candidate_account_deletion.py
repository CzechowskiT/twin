"""Candidate self-service account deletion API tests — R-019."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Candidate, CandidatePrivacyRequest, CandidateTrustAuditEvent, User
from app.database.session import get_db
from app.limiter import limiter
from app.main import app
from tests.test_auth_integration import _sqlite_session


def _seed_user(db: Session, email: str = "delete-me@example.com") -> tuple[User, Candidate]:
    user = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        is_active=True,
        referral_public_token="abc123",
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Delete Me",
        skills='["python"]',
        preferred_job_titles='["engineer"]',
        location="Warsaw",
        cv_text="secret cv",
    )
    db.add(cand)
    db.commit()
    return user, cand


def _client_for(db: Session, user: User) -> TestClient:
    limiter.reset()
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
    return TestClient(app)


def test_delete_account_requires_confirmation() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "WRONG"})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_anonymizes_and_deactivates() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "gone@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "DELETE"})
        assert r.status_code == 200
        body = r.json()
        assert body["deleted"] is True
        assert body["privacy_request_id"] > 0

        db.expire_all()
        u = db.query(User).filter(User.id == user.id).first()
        c = db.query(Candidate).filter(Candidate.id == cand.id).first()
        assert u is not None and c is not None
        assert u.is_active is False
        assert u.email.endswith("@anonymized.twin")
        assert u.referral_public_token is None
        assert c.name == "Deleted User"
        assert c.cv_text is None
        assert c.location is None

        pr = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.candidate_id == cand.id).first()
        assert pr is not None
        assert pr.request_type == "deletion"
        assert pr.status == "completed"

        audit = (
            db.query(CandidateTrustAuditEvent)
            .filter(CandidateTrustAuditEvent.candidate_id == cand.id)
            .order_by(CandidateTrustAuditEvent.id.desc())
            .first()
        )
        assert audit is not None
        assert audit.event_type == "account_deleted"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_second_attempt_blocked() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "twice@example.com")
        client = _client_for(db, user)
        r1 = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "DELETE"})
        assert r1.status_code == 200
        # After deletion user.is_active=False — auth dependency rejects further calls.
        r2 = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "DELETE"})
        assert r2.status_code == 409
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_requires_auth() -> None:
    db = _sqlite_session()
    try:
        limiter.reset()
        client = TestClient(app)
        r = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "DELETE"})
        assert r.status_code in {401, 403}
    finally:
        db.close()
