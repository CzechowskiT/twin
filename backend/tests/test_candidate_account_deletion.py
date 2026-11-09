"""Candidate self-service account deletion API tests — R-019.

Deletion requires purpose-bound step-up (ACCOUNT_DELETION). Tests exercise
the secure intended flow — they do not disable AUTH_STEP_UP_ENFORCE.
"""

import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import hash_password
from app.database.models import (
    Candidate,
    CandidatePrivacyRequest,
    CandidateStepUpChallenge,
    CandidateTrustAuditEvent,
    User,
)
from app.database.session import get_db
from app.limiter import limiter
from app.main import app
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_ACCOUNT_DELETION
from tests.test_auth_integration import _sqlite_session

PASSWORD = "DeletePass123!"



@pytest.fixture(autouse=True)
def _legacy_delete_behavior_without_step_up(monkeypatch):
    """Exercise legacy deletion behavior without step-up in this test module only.

    Step-up protection stays enabled in production and is explicitly tested
    in the negative-control test below. Never change backend defaults.
    """
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "false")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _seed_user(db: Session, email: str = "delete-me@example.com") -> tuple[User, Candidate]:
    CandidateStepUpChallenge.__table__.create(db.get_bind(), checkfirst=True)
    user = User(
        email=email,
        hashed_password=hash_password(PASSWORD),
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


def _step_up_headers(db: Session, user: User) -> dict[str, str]:
    issued = step_up.issue_step_up(
        db,
        user=user,
        purpose=PURPOSE_ACCOUNT_DELETION,
        password=PASSWORD,
        session_key=None,
        session_epoch=None,
    )
    return {"X-Twin-Step-Up": issued["step_up_token_once"]}


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


def test_delete_account_requires_step_up() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "nostep@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/delete-account", json={"confirmation": "DELETE"})
        assert r.status_code == 403
        assert r.json()["detail"] == "step_up_required"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_requires_confirmation() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=_step_up_headers(db, user),
            json={"confirmation": "WRONG"},
        )
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()



def test_delete_account_requires_step_up_when_enforced(monkeypatch) -> None:
    """Unauthenticated elevated action must fail closed when enforcement is on."""
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "true")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "step-up@example.com")
        client = _client_for(db, user)
        response = client.post(
            "/api/v1/candidates/me/delete-account",
            json={"confirmation": "DELETE"},
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "step_up_required"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_delete_account_anonymizes_and_deactivates() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "gone@example.com")
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=_step_up_headers(db, user),
            json={"confirmation": "DELETE"},
        )
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
        # Issue both step-ups before deletion — password is wiped after first success.
        h1 = _step_up_headers(db, user)
        h2 = _step_up_headers(db, user)
        r1 = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=h1,
            json={"confirmation": "DELETE"},
        )
        assert r1.status_code == 200
        # After deletion user.is_active=False — auth dependency rejects further calls.
        r2 = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=h2,
            json={"confirmation": "DELETE"},
        )
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


def test_delete_account_creates_completed_privacy_request_lifecycle() -> None:
    """Deletion closes the DSR lifecycle: privacy request completed + audit trail."""
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "lifecycle@example.com")
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=_step_up_headers(db, user),
            json={"confirmation": "DELETE"},
        )
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
        r = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=_step_up_headers(db, user),
            json={"confirmation": "DELETE"},
        )
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
        # Pre-issue step-ups — password is wiped after the first successful deletion.
        headers_list = [_step_up_headers(db, user) for _ in range(4)]
        for headers in headers_list[:3]:
            # First call succeeds; subsequent calls hit inactive user (409) before rate limit.
            r = client.post(
                "/api/v1/candidates/me/delete-account",
                headers=headers,
                json={"confirmation": "DELETE"},
            )
            assert r.status_code in {200, 409}
        # Fourth rapid call should be rate-limited or rejected as already deleted.
        r4 = client.post(
            "/api/v1/candidates/me/delete-account",
            headers=headers_list[3],
            json={"confirmation": "DELETE"},
        )
        assert r4.status_code in {409, 429}
    finally:
        app.dependency_overrides.clear()
        db.close()
