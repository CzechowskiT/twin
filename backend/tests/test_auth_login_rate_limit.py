"""Login rate limiting."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.schemas.auth import Token
from app.services.login_rate_limit import reset_login_rate_limit_state


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_rate_limit_state() -> None:
    reset_login_rate_limit_state()
    yield
    reset_login_rate_limit_state()


@patch("app.api.auth._authenticate", return_value=Token(access_token="test-token"))
def test_login_json_rate_limit_returns_429(_mock_auth: MagicMock, client: TestClient) -> None:
    get_settings.cache_clear()
    with patch.dict(os.environ, {"AUTH_LOGIN_RATE_LIMIT_PER_MINUTE": "2"}):
        get_settings.cache_clear()
        for _ in range(2):
            r = client.post(
                "/api/v1/auth/login/json",
                json={"email": "nobody@example.com", "password": "any"},
            )
            assert r.status_code == 200
        r3 = client.post(
            "/api/v1/auth/login/json",
            json={"email": "nobody@example.com", "password": "any"},
        )
        assert r3.status_code == 429
        assert "Too many" in r3.json().get("detail", "")
    get_settings.cache_clear()
