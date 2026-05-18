"""Tests for LinkedIn OAuth helpers and auth routes."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.linkedin_oauth import (
    LinkedInProfile,
    build_authorize_url,
    create_oauth_state,
    exchange_code_for_profile,
    is_linkedin_credentials_configured,
    is_linkedin_oauth_configured,
    verify_oauth_state,
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_oauth_state_roundtrip() -> None:
    state = create_oauth_state()
    assert verify_oauth_state(state)
    assert not verify_oauth_state("not-a-valid-state")


@patch("app.services.linkedin_oauth.get_settings")
def test_build_authorize_url(mock_settings: MagicMock) -> None:
    mock_settings.return_value.linkedin_client_id = "cid"
    mock_settings.return_value.linkedin_client_secret = "secret"
    mock_settings.return_value.linkedin_redirect_uri = "http://localhost/cb"
    url = build_authorize_url("state-123")
    assert "linkedin.com/oauth/v2/authorization" in url
    assert "client_id=cid" in url
    assert "state=state-123" in url
    assert "scope=openid" in url


@patch("app.services.linkedin_oauth.get_settings")
def test_is_configured(mock_settings: MagicMock) -> None:
    mock_settings.return_value.linkedin_client_id = ""
    mock_settings.return_value.linkedin_client_secret = "x"
    mock_settings.return_value.linkedin_redirect_uri = "http://x"
    assert not is_linkedin_credentials_configured()
    assert not is_linkedin_oauth_configured()

    mock_settings.return_value.linkedin_client_id = "id"
    assert is_linkedin_credentials_configured()
    assert is_linkedin_oauth_configured()


def test_linkedin_status_endpoint_removed(client: TestClient) -> None:
    res = client.get("/api/v1/auth/linkedin/status")
    assert res.status_code == 404


@patch("app.services.linkedin_oauth.httpx.Client")
@patch("app.services.linkedin_oauth.get_settings")
def test_exchange_code_for_profile(mock_settings: MagicMock, mock_client_cls: MagicMock) -> None:
    mock_settings.return_value.linkedin_client_id = "cid"
    mock_settings.return_value.linkedin_client_secret = "secret"
    mock_settings.return_value.linkedin_redirect_uri = "http://localhost/cb"

    mock_client = MagicMock()
    mock_client_cls.return_value.__enter__.return_value = mock_client

    token_res = MagicMock()
    token_res.status_code = 200
    token_res.json.return_value = {"access_token": "at-1"}

    profile_res = MagicMock()
    profile_res.status_code = 200
    profile_res.json.return_value = {
        "sub": "li-99",
        "email": "User@Example.com",
        "name": "Test User",
    }

    mock_client.post.return_value = token_res
    mock_client.get.return_value = profile_res

    profile = exchange_code_for_profile("auth-code")
    assert profile.linkedin_id == "li-99"
    assert profile.email == "user@example.com"
    assert profile.name == "Test User"


@patch("app.api.auth.get_settings")
@patch("app.api.auth.is_linkedin_oauth_configured", return_value=False)
def test_linkedin_login_not_configured(
    _cfg: MagicMock,
    mock_settings: MagicMock,
    client: TestClient,
) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    res = client.get("/api/v1/auth/linkedin/login", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"] == "http://localhost:3000/login?error=linkedin_not_configured"


@patch("app.api.auth.build_authorize_url", return_value="https://www.linkedin.com/oauth/v2/authorization?x=1")
@patch("app.api.auth.create_oauth_state", return_value="state-jwt")
@patch("app.api.auth.is_linkedin_oauth_configured", return_value=True)
def test_linkedin_login_redirect(
    _cfg: MagicMock,
    _state: MagicMock,
    _url: MagicMock,
    client: TestClient,
) -> None:
    res = client.get("/api/v1/auth/linkedin/login", follow_redirects=False)
    assert res.status_code == 302
    assert res.headers["location"].startswith("https://www.linkedin.com/oauth")


@patch("app.api.auth.get_settings")
def test_linkedin_callback_invalid_state(mock_settings: MagicMock, client: TestClient) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    res = client.get(
        "/api/v1/auth/linkedin/callback?code=abc&state=bad",
        follow_redirects=False,
    )
    assert res.status_code in (302, 307)
    assert res.headers["location"] == "http://localhost:3000/auth/callback?error=invalid_state"


@patch("app.api.auth.ensure_candidate_from_linkedin", return_value=False)
@patch("app.api.auth.create_access_token", return_value="jwt-user")
@patch("app.api.auth.user_from_linkedin")
@patch("app.api.auth.exchange_code_for_profile")
@patch("app.api.auth.verify_oauth_state", return_value=True)
@patch("app.api.auth.get_settings")
def test_linkedin_callback_success(
    mock_settings: MagicMock,
    _verify: MagicMock,
    mock_exchange: MagicMock,
    mock_user_from: MagicMock,
    _token: MagicMock,
    _sync: MagicMock,
    client: TestClient,
) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    mock_exchange.return_value = LinkedInProfile(
        linkedin_id="li-1",
        email="a@b.com",
        name="A B",
    )
    user = MagicMock()
    user.is_active = True
    user.email = "a@b.com"
    mock_user_from.return_value = user

    res = client.get(
        "/api/v1/auth/linkedin/callback?code=good&state=valid",
        follow_redirects=False,
    )
    assert res.status_code in (302, 307)
    assert res.headers["location"] == "http://localhost:3000/auth/callback?token=jwt-user"


@patch("app.api.auth.ensure_candidate_from_linkedin", return_value=True)
@patch("app.api.auth.create_access_token", return_value="jwt-user")
@patch("app.api.auth.user_from_linkedin")
@patch("app.api.auth.exchange_code_for_profile")
@patch("app.api.auth.verify_oauth_state", return_value=True)
@patch("app.api.auth.get_settings")
def test_linkedin_callback_new_profile_redirects_to_profile(
    mock_settings: MagicMock,
    _verify: MagicMock,
    mock_exchange: MagicMock,
    mock_user_from: MagicMock,
    _token: MagicMock,
    _sync: MagicMock,
    client: TestClient,
) -> None:
    mock_settings.return_value.frontend_url = "http://localhost:3000"
    mock_exchange.return_value = LinkedInProfile(
        linkedin_id="li-2",
        email="new@b.com",
        name="New User",
    )
    user = MagicMock()
    user.is_active = True
    user.email = "new@b.com"
    mock_user_from.return_value = user

    res = client.get(
        "/api/v1/auth/linkedin/callback?code=good&state=valid",
        follow_redirects=False,
    )
    loc = res.headers["location"]
    assert "token=jwt-user" in loc
    assert "next=%2Fprofile" in loc or "next=/profile" in loc
