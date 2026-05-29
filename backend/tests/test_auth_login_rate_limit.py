"""Login rate limiting via SlowAPI."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from app.limiter import limiter
from app.main import app
from app.schemas.auth import Token


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_slowapi() -> None:
    limiter.reset()
    yield
    limiter.reset()


@patch("app.api.auth._authenticate", return_value=Token(access_token="test-token"))
def test_login_json_rate_limit_returns_429_after_five(_mock_auth: MagicMock, client: TestClient) -> None:
    for i in range(5):
        r = client.post(
            "/api/v1/auth/login/json",
            json={"email": "nobody@example.com", "password": "any"},
        )
        assert r.status_code == 200, r.text
    r6 = client.post(
        "/api/v1/auth/login/json",
        json={"email": "nobody@example.com", "password": "any"},
    )
    assert r6.status_code == 429
    body = r6.json()
    detail = body.get("detail") or body.get("error") or ""
    if isinstance(detail, list):
        detail = " ".join(str(x) for x in detail)
    else:
        detail = str(detail or "")
    assert "rate" in detail.lower() or "limit" in detail.lower() or "exceeded" in detail.lower()


@patch(
    "app.api.auth._authenticate",
    side_effect=HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"),
)
def test_login_json_failed_attempts_still_hit_rate_limit(_mock_auth: MagicMock, client: TestClient) -> None:
    """Failed login attempts are still throttled to cap brute-force pressure."""
    for i in range(5):
        r = client.post(
            "/api/v1/auth/login/json",
            json={"email": "wrong@example.com", "password": f"wrong-{i}"},
        )
        assert r.status_code == 401, r.text
    r6 = client.post(
        "/api/v1/auth/login/json",
        json={"email": "wrong@example.com", "password": "wrong-final"},
    )
    assert r6.status_code == 429
