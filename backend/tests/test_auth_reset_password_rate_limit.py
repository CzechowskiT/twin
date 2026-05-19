"""Rate limiting on POST /auth/reset-password."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.limiter import limiter
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_slowapi() -> None:
    limiter.reset()
    yield
    limiter.reset()


@patch("app.api.auth.reset_password_with_token", return_value=False)
def test_reset_password_rate_limit_returns_429_on_fourth_request(_mock_reset, client: TestClient) -> None:
    payload = {"token": "invalid-token", "password": "NewPassword123!"}
    statuses = []
    for _ in range(4):
        res = client.post("/api/v1/auth/reset-password", json=payload)
        statuses.append(res.status_code)
    assert statuses[3] == 429
