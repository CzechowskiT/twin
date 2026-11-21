"""Candidate self-service account deletion API tests — R-019."""

import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.models import Candidate, CandidatePrivacyRequest, CandidateTrustAuditEvent, User
from app.database.session import get_db
from app.limiter import limiter
from app.main import app
from app.services.candidate_account_recovery_constants import PURPOSE_ACCOUNT_DELETION
from app.services.step_up_request import STEP_UP_HEADER
from tests.test_auth_integration import _sqlite_session

TEST_PASSWORD = "Test-only candidate password!"
DELETE_PATH = "/api/v1/candidates/me/delete-account"


def _seed_user(db: Session, email: str = "delete-me@example.com") -> tuple[User, Candidate]:
    user = User(
        email=email,
        hashed_password=hash_password(TEST_PASSWORD),
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
        yield db

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    login = client.post("/api/v1/auth/login/json", json={"email": user.email, "password": TEST_PASSWORD})
    assert login.status_code == 200
    client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
    return client


def _confirmed_delete(client: TestClient, confirmation: str = "DELETE") -> Response:
    step = client.post("/api/v1/auth/step-up/issue", json={
        "purpose": PURPOSE_ACCOUNT_DELETION, "password": TEST_PASSWORD,
    })
    assert step.status_code == 200
    return client.post(DELETE_PATH, json={"confirmation": confirmation}, headers={
        STEP_UP_HEADER: step.json()["step_up_token_once"],
    })


def test_delete_account_requires_confirmation() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        unconfirmed = client.post(DELETE_PATH, json={"confirmation": "DELETE"})
        assert unconfirmed.status_code == 403
        assert unconfirmed.json()["detail"] == "step_up_required"
        r = _confirmed_delete(client, "WRONG")
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_anonymizes_and_deactivates() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "gone@example.com")
        client = _client_for(db, user)
        r = _confirmed_delete(client)
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
        r1 = _confirmed_delete(client)
        assert r1.status_code == 200
        r2 = client.post(DELETE_PATH, json={"confirmation": "DELETE"})
        assert r2.status_code == 401
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_requires_auth() -> None:
    db = _sqlite_session()
    try:
        limiter.reset()
        client = TestClient(app)
        r = client.post(DELETE_PATH, json={"confirmation": "DELETE"})
        assert r.status_code in {401, 403}
    finally:
        db.close()


def test_delete_account_creates_completed_privacy_request_lifecycle() -> None:
    """Deletion closes the DSR lifecycle: privacy request completed + audit trail."""
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "lifecycle@example.com")
        client = _client_for(db, user)
        r = _confirmed_delete(client)
        assert r.status_code == 200
        pr_id = r.json()["privacy_request_id"]

        pr = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.id == pr_id).first()
        assert pr is not None
        assert pr.request_type == "deletion"
        assert pr.status == "completed"
        assert pr.completed_at is not None
        assert pr.payload_json is not None
        payload = json.loads(pr.payload_json) if isinstance(pr.payload_json, str) else pr.payload_json
        assert payload.get("self_service") is True

        audits = (
            db.query(CandidateTrustAuditEvent)
            .filter(CandidateTrustAuditEvent.candidate_id == cand.id)
            .all()
        )
        assert any(a.event_type == "account_deleted" for a in audits)
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_blocked_by_legal_hold() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "held@example.com")
        db.add(
            CandidatePrivacyRequest(
                candidate_id=cand.id,
                created_by_user_id=user.id,
                request_type="deletion",
                status="pending",
                legal_hold=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        client = _client_for(db, user)
        r = _confirmed_delete(client)
        assert r.status_code == 403
        assert "legal_hold" in r.json()["detail"]
        db.refresh(user)
        assert user.is_active is True
        assert user.email == "held@example.com"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_rate_limited() -> None:
    """Self-service delete is capped at 3/min per user (abuse guard)."""
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "ratelimit@example.com")
        client = _client_for(db, user)
        for _ in range(3):
            assert _confirmed_delete(client, "WRONG").status_code == 422
        assert _confirmed_delete(client).status_code == 429
        db.refresh(user)
        assert user.is_active
    finally:
        app.dependency_overrides.clear()
        db.close()
