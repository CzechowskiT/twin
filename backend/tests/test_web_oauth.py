"""Tests for web OAuth routes (Google/GitHub/Apple) and shared status."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.oauth_state import create_oauth_state, verify_oauth_state
from app.services.oauth_types import OAuthUserProfile


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@patch("app.api.auth.is_linkedin_oauth_configured", return_value=False)
def test_oauth_status_shape(_li: MagicMock, client: TestClient) -> None:
    res = client.get("/api/v1/auth/oauth/status")
    assert res.status_code == 200
    body = res.json()
    assert body == {
        "linkedin": False,
        "google": False,
        "github": False,
        "apple": False,
    }


@patch("app.api.auth.is_google_configured", return_value=False)
def test_google_login_not_configured(_mock: MagicMock, client: TestClient) -> None:
    res = client.get("/api/v1/auth/google/login", follow_redirects=False)
    assert res.status_code == 302
    assert "error=google_not_configured" in res.headers["location"]


@patch("app.api.auth.build_google_authorize_url", return_value="https://accounts.google.com/o/oauth2/v2/auth?x=1")
@patch("app.api.auth.create_oauth_state", return_value="state-jwt")
@patch("app.api.auth.is_google_configured", return_value=True)
def test_google_login_redirect(_mock: MagicMock, _s: MagicMock, _u: MagicMock, client: TestClient) -> None:
    res = client.get("/api/v1/auth/google/login", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"].startswith("https://accounts.google.com")


@patch("app.api.auth.get_settings")
def test_google_callback_invalid_state(mock_settings: MagicMock, client: TestClient) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    res = client.get(
        "/api/v1/auth/google/callback?code=abc&state=bad",
        follow_redirects=False,
    )
    assert res.status_code in (302, 307)
    assert res.headers["location"] == "http://localhost:3000/auth/callback?error=invalid_state"


@patch("app.api.auth.ensure_candidate_from_oauth_profile", return_value=False)
@patch("app.api.auth.create_access_token", return_value="jwt-user")
@patch("app.api.auth.user_from_oauth")
@patch("app.api.auth.exchange_google_code_for_profile")
@patch("app.api.auth.verify_oauth_state", return_value=True)
@patch("app.api.auth.get_settings")
def test_google_callback_success(
    mock_settings: MagicMock,
    _verify: MagicMock,
    mock_exchange: MagicMock,
    mock_user_from: MagicMock,
    _token: MagicMock,
    _sync: MagicMock,
    client: TestClient,
) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    mock_exchange.return_value = OAuthUserProfile(
        provider="google",
        subject="g-1",
        email="a@b.com",
        name="A B",
    )
    user = MagicMock()
    user.is_active = True
    user.email = "a@b.com"
    mock_user_from.return_value = user

    res = client.get(
        "/api/v1/auth/google/callback?code=good&state=valid",
        follow_redirects=False,
    )
    assert res.status_code in (302, 307)
    assert res.headers["location"] == "http://localhost:3000/auth/callback?token=jwt-user"


def test_oauth_state_module_roundtrip() -> None:
    state = create_oauth_state()
    assert verify_oauth_state(state)
