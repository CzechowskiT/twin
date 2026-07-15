"""Recruiter session JWT — mint, verify, exchange, and tenant isolation."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.config import get_settings
from app.core.recruiter_auth import extract_bearer_token, resolve_recruiter_company_slug
from app.core.recruiter_jwt import (
    RECRUITER_JWT_ALGORITHM,
    RECRUITER_JWT_AUDIENCE,
    RECRUITER_JWT_ISSUER,
    RECRUITER_JWT_ROLE,
    mint_recruiter_session_jwt,
    verify_recruiter_session_jwt,
)
from app.database.session import get_db
from app.limiter import limiter
from app.main import app
from tests.test_auth_integration import _sqlite_session


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_extract_bearer_token() -> None:
    assert extract_bearer_token("Bearer abc.def.ghi") == "abc.def.ghi"
    assert extract_bearer_token("bearer x") == "x"
    assert extract_bearer_token("Basic x") is None
    assert extract_bearer_token(None) is None


def test_mint_and_verify_recruiter_jwt() -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.recruiter_inbox_token = "pilot"
    token = mint_recruiter_session_jwt("nova-hiring-pl", expires_minutes=30)
    claims = verify_recruiter_session_jwt(token)
    assert claims is not None
    assert claims.tenant == "nova-hiring-pl"
    assert claims.sub == "nova-hiring-pl"


def test_reject_alg_none_and_wrong_audience() -> None:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "acme",
        "iss": RECRUITER_JWT_ISSUER,
        "aud": "wrong-audience",
        "role": RECRUITER_JWT_ROLE,
        "tenant": "acme",
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    bad = jwt.encode(payload, settings.secret_key, algorithm=RECRUITER_JWT_ALGORITHM)
    assert verify_recruiter_session_jwt(bad) is None


def test_resolve_jwt_tenant_mismatch() -> None:
    db = _sqlite_session()
    try:
        settings = get_settings()
        settings.recruiter_inbox_token = "pilot"
        token = mint_recruiter_session_jwt("nova-hiring-pl")
        ok, slug, err = resolve_recruiter_company_slug(
            db,
            settings,
            authorization=f"Bearer {token}",
            company_slug_query="other-corp",
        )
        assert not ok
        assert err == "tenant_mismatch"
        assert slug is None
    finally:
        db.close()


def test_resolve_legacy_pilot_token() -> None:
    db = _sqlite_session()
    try:
        settings = get_settings()
        settings.recruiter_inbox_token = "pilot-secret"
        ok, slug, err = resolve_recruiter_company_slug(
            db,
            settings,
            x_twin_recruiter_token="pilot-secret",
            company_slug_query="nova-hiring-pl",
        )
        assert ok
        assert slug == "nova-hiring-pl"
        assert err is None
    finally:
        db.close()


def test_exchange_recruiter_session_endpoint() -> None:
    db = _sqlite_session()
    limiter.reset()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    get_settings.cache_clear()
    settings = get_settings()
    settings.recruiter_inbox_token = "exchange-me"
    client = TestClient(app)
    try:
        bad = client.post(
            "/api/v1/auth/recruiter/session",
            json={"access_token": "wrong-token", "company_slug": "nova-hiring-pl"},
        )
        assert bad.status_code == 401

        ok = client.post(
            "/api/v1/auth/recruiter/session",
            json={"access_token": "exchange-me", "company_slug": "nova-hiring-pl"},
        )
        assert ok.status_code == 200
        body = ok.json()
        assert body["token_type"] == "bearer"
        assert body["company_slug"] == "nova-hiring-pl"
        claims = verify_recruiter_session_jwt(body["access_token"])
        assert claims is not None
        assert claims.tenant == "nova-hiring-pl"
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_recruiter_inbox_rejects_query_token() -> None:
    db = _sqlite_session()
    limiter.reset()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    get_settings.cache_clear()
    settings = get_settings()
    settings.recruiter_inbox_token = "legacy-only"
    client = TestClient(app)
    try:
        res = client.get(
            "/api/v1/recruiter/inbox",
            params={"token": "legacy-only", "company_slug": "nova-hiring-pl"},
        )
        assert res.status_code == 401
        res2 = client.get(
            "/api/v1/recruiter/inbox",
            headers={"X-Twin-Recruiter-Token": "legacy-only"},
            params={"company_slug": "nova-hiring-pl"},
        )
        assert res2.status_code == 200
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
