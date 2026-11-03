"""Founder canary admin authorization — deny candidates/recruiters; elevate + CSRF."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.security import create_access_token, hash_password
from app.database.models import Base, User
from app.database.session import get_db
from app.main import create_app
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_CANARY_ADMIN_MUTATE
from app.services.founder_canary_auth import (
    issue_elevated_token,
    parse_founder_allowlist,
    verify_elevated_csrf,
    verify_elevated_token,
)


@pytest.fixture
def canary_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "unit-test-secret-key-at-least-32-chars!!")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-machine-secret-token")
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "")
    monkeypatch.setenv("FOUNDER_COMMAND_ALLOWLIST", "founder@twin.test")
    monkeypatch.setenv("FOUNDER_CANARY_SESSION_SECRET", "canary-session-secret-at-least-32-chars!")
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "true")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client(canary_env):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    founder = User(
        email="founder@twin.test",
        hashed_password=hash_password("FounderPass123!"),
        is_active=True,
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    candidate = User(
        email="candidate@example.com",
        hashed_password=hash_password("CandidatePass123!"),
        is_active=True,
        gdpr_consent_at=datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add_all([founder, candidate])
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    test_client = TestClient(app)
    yield test_client, db, founder, candidate
    app.dependency_overrides.clear()
    db.close()


def _user_headers(email: str) -> dict[str, str]:
    token = create_access_token(email)
    return {"Authorization": f"Bearer {token}"}


def test_parse_allowlist():
    assert parse_founder_allowlist("a@x.com, b@y.com;c@z.com") == {
        "a@x.com",
        "b@y.com",
        "c@z.com",
    }


def test_unauthenticated_denied(client):
    c, *_ = client
    assert c.get("/api/v1/admin/canary/control").status_code == 401
    assert c.post("/api/v1/admin/canary/control", json={"action": "prepare"}).status_code == 401
    assert c.get("/api/v1/admin/canary/designation").status_code == 401


def test_candidate_user_denied(client):
    c, *_rest, candidate = client
    headers = _user_headers(candidate.email)
    r = c.get("/api/v1/admin/canary/control", headers=headers)
    assert r.status_code == 403
    assert "founder" in r.json()["detail"].lower()


def test_founder_read_allowed_without_elevate(client):
    c, *_rest, founder, _cand = client
    headers = _user_headers(founder.email)
    r = c.get("/api/v1/admin/canary/control", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["never_auto_active"] is True
    assert body["active_one_candidate"] is False


def test_founder_mutate_requires_step_up_or_elevate(client):
    c, db, founder, _cand = client
    headers = _user_headers(founder.email)
    denied = c.post("/api/v1/admin/canary/control", headers=headers, json={"action": "prepare"})
    assert denied.status_code == 403
    assert denied.json()["detail"] in {
        "step_up_required",
        "mfa_or_step_up_required",
    }

    issued = step_up.issue_step_up(
        db,
        user=founder,
        purpose=PURPOSE_CANARY_ADMIN_MUTATE,
        password="FounderPass123!",
        session_key=None,
        session_epoch=None,
    )
    ok = c.post(
        "/api/v1/admin/canary/control",
        headers={**headers, "X-Twin-Step-Up": issued["step_up_token_once"]},
        json={"action": "prepare"},
    )
    assert ok.status_code == 200, ok.text


def test_elevate_then_mutate_with_csrf(client):
    c, db, founder, _cand = client
    headers = _user_headers(founder.email)
    issued = step_up.issue_step_up(
        db,
        user=founder,
        purpose=PURPOSE_CANARY_ADMIN_MUTATE,
        password="FounderPass123!",
        session_key=None,
        session_epoch=None,
    )
    elev = c.post(
        "/api/v1/admin/canary/founder-elevate",
        headers={**headers, "X-Twin-Step-Up": issued["step_up_token_once"]},
        json={},
    )
    assert elev.status_code == 200, elev.text
    data = elev.json()
    assert data["elevated_token"]
    assert data["csrf_token"]

    muted = c.post(
        "/api/v1/admin/canary/designation",
        headers={
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "X-CSRF-Token": data["csrf_token"],
            "Content-Type": "application/json",
        },
        json={
            "delivery_identity": "probe@canary-designation.invalid",
            "replace_existing": True,
        },
    )
    assert muted.status_code == 200, muted.text
    assert muted.json()["status"] == "DESIGNATED_READY"
    assert muted.json()["delivery_identity_masked"]

    # Missing CSRF fail-closed
    no_csrf = c.post(
        "/api/v1/admin/canary/designation/revoke",
        headers={
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "Content-Type": "application/json",
        },
        json={},
    )
    assert no_csrf.status_code == 403

    revoked = c.post(
        "/api/v1/admin/canary/designation/revoke",
        headers={
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "X-CSRF-Token": data["csrf_token"],
            "Content-Type": "application/json",
        },
        json={},
    )
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["status"] == "NOT_DESIGNATED"


def test_ops_machine_bearer_still_works_for_scripts(client):
    c, *_ = client
    headers = {"Authorization": "Bearer ops-machine-secret-token"}
    assert c.get("/api/v1/admin/canary/control", headers=headers).status_code == 200
    r = c.post("/api/v1/admin/canary/control", headers=headers, json={"action": "prepare"})
    assert r.status_code == 200, r.text


def test_ops_token_cannot_elevate_browser_session(client):
    c, *_ = client
    r = c.post(
        "/api/v1/admin/canary/founder-elevate",
        headers={"Authorization": "Bearer ops-machine-secret-token"},
        json={},
    )
    assert r.status_code == 400


def test_elevated_token_roundtrip(canary_env):
    settings = get_settings()
    user = User(id=7, email="founder@twin.test", hashed_password="x", is_active=True)
    issued = issue_elevated_token(settings, user=user)
    uid, email = verify_elevated_token(settings, str(issued["elevated_token"]))
    assert uid == 7
    assert email == "founder@twin.test"
    verify_elevated_csrf(settings, user_id=7, csrf_token=str(issued["csrf_token"]))
