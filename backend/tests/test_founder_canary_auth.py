"""Founder canary admin authorization — CSRF, session binding, MFA, fail-closed."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.security import hash_password
from app.database.models import Base, CandidateAuthSession, User
from app.database.session import get_db
from app.main import create_app
from app.services import candidate_auth_session as cas
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_CANARY_ADMIN_MUTATE
from app.services.founder_canary_auth import (
    issue_elevated_token,
    parse_founder_allowlist,
    verify_elevated_csrf,
    verify_elevated_token,
)


FOUNDER_PASSWORD = "FounderPass123!"


@pytest.fixture
def canary_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "unit-test-secret-key-at-least-32-chars!!")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-machine-secret-token")
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "")
    monkeypatch.setenv("FOUNDER_COMMAND_ALLOWLIST", "founder@twin.test")
    monkeypatch.setenv("FOUNDER_CANARY_SESSION_SECRET", "canary-session-secret-at-least-32-chars!")
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "true")
    monkeypatch.setenv("AUTH_MANAGED_SESSION_MINT", "true")
    monkeypatch.setenv("AUTH_MANAGED_SESSION_VERIFY", "true")
    monkeypatch.setenv("AUTH_MANAGED_SESSION_ENFORCE", "true")
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
        hashed_password=hash_password(FOUNDER_PASSWORD),
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


def _mint_founder(db, founder: User) -> dict:
    return cas.issue_session(db, user=founder, kpi_excluded=True, label="founder-test")


def _user_headers_from_mint(mint: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {mint['access_token']}"}


def _step_up(db, founder: User, mint: dict) -> str:
    return step_up.issue_step_up(
        db,
        user=founder,
        purpose=PURPOSE_CANARY_ADMIN_MUTATE,
        password=FOUNDER_PASSWORD,
        session_key=mint.get("session_key"),
        session_epoch=1 if mint.get("managed") else None,
    )["step_up_token_once"]


def _elevate(client, db, founder: User) -> tuple[dict[str, str], dict]:
    mint = _mint_founder(db, founder)
    headers = _user_headers_from_mint(mint)
    step = _step_up(db, founder, mint)
    elev = client.post(
        "/api/v1/admin/canary/founder-elevate",
        headers={**headers, "X-Twin-Step-Up": step},
        json={},
    )
    assert elev.status_code == 200, elev.text
    data = elev.json()
    return headers, data


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


def test_candidate_user_denied(client):
    c, db, _founder, candidate = client
    mint = cas.issue_session(db, user=candidate, kpi_excluded=True)
    r = c.get("/api/v1/admin/canary/control", headers=_user_headers_from_mint(mint))
    assert r.status_code == 403
    assert "founder" in r.json()["detail"].lower()


def test_founder_read_allowed_without_elevate(client):
    c, db, founder, _cand = client
    mint = _mint_founder(db, founder)
    r = c.get("/api/v1/admin/canary/control", headers=_user_headers_from_mint(mint))
    assert r.status_code == 200, r.text
    assert r.json()["never_auto_active"] is True


def test_founder_mutate_requires_step_up_or_elevate(client):
    c, db, founder, _cand = client
    mint = _mint_founder(db, founder)
    headers = _user_headers_from_mint(mint)
    denied = c.post("/api/v1/admin/canary/control", headers=headers, json={"action": "prepare"})
    assert denied.status_code == 403
    assert denied.json()["detail"] == "step_up_required"

    ok = c.post(
        "/api/v1/admin/canary/control",
        headers={**headers, "X-Twin-Step-Up": _step_up(db, founder, mint)},
        json={"action": "prepare"},
    )
    assert ok.status_code == 200, ok.text


def test_elevate_then_mutate_with_csrf_and_bound_access(client):
    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    muted = c.post(
        "/api/v1/admin/canary/designation",
        headers={
            **headers,
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

    # Missing CSRF fail-closed
    no_csrf = c.post(
        "/api/v1/admin/canary/designation/revoke",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "Content-Type": "application/json",
        },
        json={},
    )
    assert no_csrf.status_code == 403

    # Missing bound access token fail-closed
    no_at = c.post(
        "/api/v1/admin/canary/designation/revoke",
        headers={
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "X-CSRF-Token": data["csrf_token"],
            "Content-Type": "application/json",
        },
        json={},
    )
    assert no_at.status_code == 401

    revoked = c.post(
        "/api/v1/admin/canary/designation/revoke",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "X-CSRF-Token": data["csrf_token"],
            "Content-Type": "application/json",
        },
        json={},
    )
    assert revoked.status_code == 200, revoked.text


def test_elevated_revoked_when_session_revoked(client):
    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    mint_sid = cas.session_key_from_token(headers["Authorization"].split(" ", 1)[1])
    assert mint_sid
    cas.revoke_session(db, user_id=founder.id, session_key=mint_sid, reason="test_revoke")
    r = c.get(
        "/api/v1/admin/canary/control",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
        },
    )
    assert r.status_code == 401


def test_elevated_revoked_when_user_deactivated(client):
    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    founder.is_active = False
    db.commit()
    r = c.get(
        "/api/v1/admin/canary/control",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
        },
    )
    assert r.status_code == 401


def test_elevated_denied_when_removed_from_allowlist(client, monkeypatch):
    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    monkeypatch.setenv("FOUNDER_COMMAND_ALLOWLIST", "other@twin.test")
    get_settings.cache_clear()
    r = c.get(
        "/api/v1/admin/canary/control",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
        },
    )
    assert r.status_code == 403
    get_settings.cache_clear()


def test_elevated_revoked_on_epoch_change(client):
    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    token = headers["Authorization"].split(" ", 1)[1]
    sid = cas.session_key_from_token(token)
    row = db.query(CandidateAuthSession).filter(CandidateAuthSession.session_key == sid).one()
    row.epoch = int(row.epoch) + 1
    db.commit()
    r = c.get(
        "/api/v1/admin/canary/control",
        headers={
            **headers,
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
        },
    )
    assert r.status_code == 401


def test_elevated_expired(client):
    from fastapi import HTTPException

    c, db, founder, _cand = client
    headers, data = _elevate(c, db, founder)
    with pytest.raises(HTTPException) as ei:
        verify_elevated_token(
            db,
            get_settings(),
            data["elevated_token"],
            access_token=headers["Authorization"].split(" ", 1)[1],
            max_age_seconds=-1,
        )
    assert ei.value.status_code == 401
    assert "expired" in str(ei.value.detail).lower()


def test_wrong_principal_access_token_rejected(client):
    c, db, founder, candidate = client
    headers, data = _elevate(c, db, founder)
    other = cas.issue_session(db, user=candidate, kpi_excluded=True)
    r = c.post(
        "/api/v1/admin/canary/control",
        headers={
            **_user_headers_from_mint(other),
            "X-Twin-Founder-Canary-Elevated": data["elevated_token"],
            "X-CSRF-Token": data["csrf_token"],
        },
        json={"action": "prepare"},
    )
    assert r.status_code == 401


def test_mfa_enabled_rejects_password_step_up_alone(client, monkeypatch):
    c, db, founder, _cand = client
    # Mark MFA enabled without full enroll crypto — user_mfa_enabled checks ENABLED factor.
    monkeypatch.setattr(
        "app.services.candidate_mfa.user_mfa_enabled",
        lambda db, *, user_id: user_id == founder.id,
    )
    mint = _mint_founder(db, founder)
    headers = _user_headers_from_mint(mint)
    step = _step_up(db, founder, mint)
    elev = c.post(
        "/api/v1/admin/canary/founder-elevate",
        headers={**headers, "X-Twin-Step-Up": step},
        json={},
    )
    assert elev.status_code == 403
    assert elev.json()["detail"] == "mfa_required"


def test_production_requires_mfa_enrollment_no_password_bootstrap(client, monkeypatch):
    """Production/staging refuse password-only elevate when TOTP is not enrolled."""
    c, db, founder, _cand = client
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("FOUNDER_CANARY_REQUIRE_MFA", "true")
    monkeypatch.setattr(
        "app.services.candidate_mfa.user_mfa_enabled",
        lambda db, *, user_id: False,
    )
    get_settings.cache_clear()
    mint = _mint_founder(db, founder)
    headers = _user_headers_from_mint(mint)
    step = _step_up(db, founder, mint)
    elev = c.post(
        "/api/v1/admin/canary/founder-elevate",
        headers={**headers, "X-Twin-Step-Up": step},
        json={},
    )
    assert elev.status_code == 403
    assert elev.json()["detail"] == "mfa_enrollment_required"
    status = c.get("/api/v1/admin/canary/auth-status", headers=headers)
    assert status.status_code == 200
    assert status.json()["mfa_enrollment_required"] is True
    get_settings.cache_clear()


def test_development_password_bootstrap_when_mfa_not_required(client, monkeypatch):
    """Dev bootstrap: password step-up allowed only when MFA not enrolled and require_mfa false."""
    c, db, founder, _cand = client
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("FOUNDER_CANARY_REQUIRE_MFA", "false")
    monkeypatch.setattr(
        "app.services.candidate_mfa.user_mfa_enabled",
        lambda db, *, user_id: False,
    )
    get_settings.cache_clear()
    headers, data = _elevate(c, db, founder)
    assert data.get("elevated_token")
    assert data.get("assurance") == "step_up_password"
    assert data.get("mfa_enrollment_required_in_environment") is False
    get_settings.cache_clear()


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


def test_production_requires_dedicated_canary_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "production-secret-key-at-least-32-chars!!")
    monkeypatch.setenv("FOUNDER_CANARY_SESSION_SECRET", "")
    monkeypatch.setenv("FOUNDER_COMMAND_CSRF_SECRET", "")
    monkeypatch.setenv("FOUNDER_COMMAND_ALLOWLIST", "founder@twin.test")
    get_settings.cache_clear()
    settings = get_settings()
    user = User(id=1, email="founder@twin.test", hashed_password="x", is_active=True)
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as ei:
        issue_elevated_token(
            settings,
            user=user,
            session_key=None,
            session_epoch=None,
            access_token="tok",
        )
    assert ei.value.status_code == 503
    get_settings.cache_clear()


def test_elevated_token_roundtrip(canary_env):
    settings = get_settings()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(
        email="founder@twin.test",
        hashed_password=hash_password("x"),
        is_active=True,
        gdpr_consent_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    mint = cas.issue_session(db, user=user, kpi_excluded=True)
    issued = issue_elevated_token(
        settings,
        user=user,
        session_key=mint["session_key"],
        session_epoch=1,
        access_token=mint["access_token"],
    )
    uid, email, sid, epoch = verify_elevated_token(
        db, settings, str(issued["elevated_token"]), access_token=mint["access_token"]
    )
    assert uid == user.id
    assert email == "founder@twin.test"
    assert sid == mint["session_key"]
    assert epoch == 1
    verify_elevated_csrf(settings, user_id=user.id, csrf_token=str(issued["csrf_token"]))
    db.close()
