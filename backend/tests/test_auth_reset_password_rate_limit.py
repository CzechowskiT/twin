"""Rate limiting and response-safety on POST /auth/reset-password."""

from unittest.mock import MagicMock, patch

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


def _detail_text(body: dict) -> str:
    detail = body.get("detail") or body.get("error") or ""
    if isinstance(detail, list):
        return " ".join(str(item) for item in detail)
    return str(detail or "")


@patch("app.api.auth.reset_password_with_token", return_value=False)
def test_reset_password_under_limit_returns_existing_invalid_link_semantics(
    mock_reset: MagicMock, client: TestClient
) -> None:
    payload = {"token": "invalid-token", "password": "NewPassword123!"}
    for _ in range(3):
        response = client.post("/api/v1/auth/reset-password", json=payload)
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == "Invalid or expired reset link"
    assert mock_reset.call_count == 3


@patch("app.api.auth.reset_password_with_token", return_value=False)
def test_reset_password_rate_limit_returns_429_after_three_attempts(
    mock_reset: MagicMock, client: TestClient
) -> None:
    payload = {"token": "invalid-token", "password": "NewPassword123!"}
    responses = [client.post("/api/v1/auth/reset-password", json=payload) for _ in range(4)]

    assert [r.status_code for r in responses[:3]] == [400, 400, 400]
    limited = responses[3]
    assert limited.status_code == 429, limited.text
    assert "invalid-token" not in limited.text
    assert "NewPassword123!" not in limited.text
    assert "token" not in _detail_text(limited.json()).lower()
    assert mock_reset.call_count == 3


@patch("app.api.auth.reset_password_with_token", return_value=True)
def test_reset_password_success_under_limit_preserves_success_response(
    mock_reset: MagicMock, client: TestClient
) -> None:
    payload = {"token": "valid-token", "password": "NewPassword123!"}

    first = client.post("/api/v1/auth/reset-password", json=payload)
    second = client.post("/api/v1/auth/reset-password", json=payload)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json() == {"message": "Password updated. You can log in with your new password."}
    assert second.json() == {"message": "Password updated. You can log in with your new password."}
    assert "valid-token" not in first.text
    assert "valid-token" not in second.text
    assert mock_reset.call_count == 2
