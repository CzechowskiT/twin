"""Founder canary authorization: allowlist, managed session, MFA/step-up, scopes."""

from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.core.security import create_access_token_claims, hash_password
from app.database.models import CandidateAuthSession, RealCanaryCandidateDesignation, User
from app.database.session import get_db
from app.main import create_app
from app.services import candidate_auth_session as cas
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_FOUNDER_CANARY_ADMIN
from app.services.candidate_auth_session_constants import (
    MANAGED_CLAIM_EPOCH,
    MANAGED_CLAIM_SID,
    MANAGED_CLAIM_TYP,
)
from app.services.candidate_mfa_constants import ASSURANCE_AAL2_TOTP
from app.services.founder_canary_auth import (
    CANARY_SCOPE_READ,
    CANARY_TOKEN_TYPE,
)
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def canary_client(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "founder-canary-test-secret-at-least-32-chars")
    monkeypatch.setenv("FOUNDER_COMMAND_ALLOWLIST", "founder@example.org")
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "true")
    get_settings.cache_clear()
    db = _sqlite_session()
    founder = User(
        email="founder@example.org",
        hashed_password=hash_password("FounderPass123!"),
        is_active=True,
        gdpr_consent_at=datetime.utcnow(),
    )
    candidate = User(
        email="candidate@example.org",
        hashed_password=hash_password("CandidatePass123!"),
        is_active=True,
        gdpr_consent_at=datetime.utcnow(),
    )
    db.add_all([founder, candidate])
    db.commit()
    db.refresh(founder)
    db.refresh(candidate)
    founder_aal2 = cas.issue_session(db, user=founder, assurance_level=ASSURANCE_AAL2_TOTP)
    candidate_aal2 = cas.issue_session(db, user=candidate, assurance_level=ASSURANCE_AAL2_TOTP)

    def override_db():
        yield db

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    yield TestClient(app), db, founder, candidate, founder_aal2, candidate_aal2
    app.dependency_overrides.clear()
    db.close()
    get_settings.cache_clear()


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _issue_canary(client: TestClient, access_token: str, step_token: str | None = None):
    headers = _bearer(access_token)
    if step_token:
        headers["X-Twin-Step-Up"] = step_token
    return client.post("/api/v1/admin/canary/session", headers=headers)


def test_mfa_founder_gets_scoped_session_and_candidate_api_rejects_it(canary_client):
    client, _, _, _, founder_aal2, _ = canary_client
    issued = _issue_canary(client, founder_aal2["access_token"])
    assert issued.status_code == 200, issued.text
    token = issued.json()["canary_session_token_once"]
    assert client.get("/api/v1/admin/canary/control", headers=_bearer(token)).status_code == 200
    assert client.get("/api/v1/auth/me", headers=_bearer(token)).status_code == 401


def test_normal_candidate_and_unauthenticated_users_are_denied(canary_client):
    client, _, _, _, _, candidate_aal2 = canary_client
    denied = _issue_canary(client, candidate_aal2["access_token"])
    assert denied.status_code == 403
    assert denied.json()["detail"] == "founder_access_required"
    assert client.get("/api/v1/admin/canary/control").status_code == 401
    for path in (
        "/api/v1/admin/canary/control",
        "/api/v1/admin/canary/completion-report",
        "/api/v1/admin/canary/designation",
        "/api/v1/admin/canary/activation-preflight",
    ):
        assert client.get(path, headers=_bearer(candidate_aal2["access_token"])).status_code == 401


def test_aal1_founder_requires_step_up_even_if_global_gate_is_disabled(
    canary_client,
    monkeypatch,
):
    client, db, founder, _, _, _ = canary_client
    aal1 = cas.issue_session(db, user=founder, assurance_level="AAL1_PRIMARY")
    monkeypatch.setenv("AUTH_STEP_UP_ENFORCE", "false")
    get_settings.cache_clear()
    required = _issue_canary(client, aal1["access_token"])
    assert required.status_code == 403
    assert required.json()["detail"] == "step_up_required"
    once = step_up.issue_step_up(
        db,
        user=founder,
        purpose=PURPOSE_FOUNDER_CANARY_ADMIN,
        password="FounderPass123!",
        session_key=aal1["session_key"],
        session_epoch=1,
    )
    granted = _issue_canary(client, aal1["access_token"], once["step_up_token_once"])
    assert granted.status_code == 200
    replay = _issue_canary(client, aal1["access_token"], once["step_up_token_once"])
    assert replay.status_code == 403
    assert replay.json()["detail"] == "step_up_used"


def test_underlying_session_revocation_invalidates_canary_capability(canary_client):
    client, db, founder, _, founder_aal2, _ = canary_client
    issued = _issue_canary(client, founder_aal2["access_token"])
    token = issued.json()["canary_session_token_once"]
    cas.revoke_session(
        db,
        user_id=founder.id,
        session_key=founder_aal2["session_key"],
        reason="test",
    )
    response = client.get("/api/v1/admin/canary/control", headers=_bearer(token))
    assert response.status_code == 401
    assert response.json()["detail"] == "managed_session_required"


def test_read_only_capability_cannot_mutate(canary_client):
    client, _, founder, _, founder_aal2, _ = canary_client
    read_only = create_access_token_claims(
        {
            "sub": f"founder-canary:{founder.id}",
            "uid": founder.id,
            MANAGED_CLAIM_TYP: CANARY_TOKEN_TYPE,
            MANAGED_CLAIM_SID: founder_aal2["session_key"],
            MANAGED_CLAIM_EPOCH: 1,
            "scope": CANARY_SCOPE_READ,
        },
        expires_minutes=5,
    )
    response = client.post(
        "/api/v1/admin/canary/control",
        headers=_bearer(read_only),
        json={"action": "prepare"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "canary_write_scope_required"


def test_designation_stays_masked_encrypted_audited_and_revocable(canary_client):
    client, db, founder, _, founder_aal2, _ = canary_client
    token = _issue_canary(client, founder_aal2["access_token"]).json()[
        "canary_session_token_once"
    ]
    created = client.post(
        "/api/v1/admin/canary/designation",
        headers=_bearer(token),
        json={
            "delivery_identity": "real.person@trusted.org",
            "delivery_channel": "email",
            "secure_roster_reference": "founder-roster-1",
            "replace_existing": True,
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["delivery_identity_masked"] != "real.person@trusted.org"
    assert "ciphertext" not in body
    row = db.query(RealCanaryCandidateDesignation).one()
    assert "real.person@trusted.org" not in row.delivery_identity_ciphertext
    assert row.designated_by_actor == f"founder_user:{founder.id}"
    revoked = client.post(
        "/api/v1/admin/canary/designation/revoke",
        headers=_bearer(token),
        json={"designation_id": body["designation_id"]},
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "NOT_DESIGNATED"
