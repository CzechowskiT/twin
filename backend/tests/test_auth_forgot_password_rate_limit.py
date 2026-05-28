"""Rate limiting and response-safety on POST /auth/forgot-password."""

from collections.abc import Iterator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.session import get_db
from app.limiter import limiter
from app.main import app
from app.services.login_rate_limit import reset_login_rate_limit_state


@pytest.fixture
def client() -> Iterator[TestClient]:
    mock_db = MagicMock()

    def _override_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
def _reset_limiters() -> None:
    limiter.reset()
    reset_login_rate_limit_state()
    yield
    limiter.reset()
    reset_login_rate_limit_state()


@patch("app.api.auth.request_password_reset", return_value="stub message")
def test_forgot_password_under_limit_keeps_generic_ack(mock_reset: MagicMock, client: TestClient) -> None:
    payload = {"email": "user@example.com"}
    allowed = min(5, int(get_settings().auth_forgot_password_rate_limit_per_minute))
    for _ in range(allowed):
        response = client.post("/api/v1/auth/forgot-password", json=payload)
        assert response.status_code == 200, response.text
        assert response.json() == {"message": "stub message"}
        assert "token" not in response.text.lower()
    assert mock_reset.call_count == allowed


@patch("app.api.auth.request_password_reset", return_value="stub message")
def test_forgot_password_rate_limit_returns_429_after_five_attempts(
    mock_reset: MagicMock, client: TestClient
) -> None:
    payload = {"email": "user@example.com"}
    allowed = min(5, int(get_settings().auth_forgot_password_rate_limit_per_minute))
    responses = [client.post("/api/v1/auth/forgot-password", json=payload) for _ in range(allowed + 1)]

    assert [r.status_code for r in responses[:allowed]] == [200] * allowed
    limited = responses[allowed]
    assert limited.status_code == 429, limited.text
    assert "token" not in limited.text.lower()
    assert "secret" not in limited.text.lower()
    assert mock_reset.call_count == allowed
