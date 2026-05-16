"""Unit tests for Google/GitHub OAuth helpers (httpx mocked)."""

from unittest.mock import MagicMock, patch

from app.services.github_oauth import exchange_github_code_for_profile
from app.services.google_oauth import exchange_google_code_for_profile
from app.services.microsoft_oauth import (
    build_microsoft_authorize_url,
    exchange_microsoft_code_for_profile,
)


@patch("app.services.google_oauth.httpx.Client")
@patch("app.services.google_oauth.get_settings")
def test_exchange_google_code_for_profile(mock_settings: MagicMock, mock_client_cls: MagicMock) -> None:
    mock_settings.return_value.google_client_id = "cid"
    mock_settings.return_value.google_client_secret = "secret"
    mock_settings.return_value.google_redirect_uri = "http://localhost/cb"

    mock_client = MagicMock()
    mock_client_cls.return_value.__enter__.return_value = mock_client

    token_res = MagicMock()
    token_res.status_code = 200
    token_res.json.return_value = {"access_token": "at-1"}

    profile_res = MagicMock()
    profile_res.status_code = 200
    profile_res.json.return_value = {
        "sub": "g-99",
        "email": "User@Example.com",
        "name": "Test User",
    }

    mock_client.post.return_value = token_res
    mock_client.get.return_value = profile_res

    profile = exchange_google_code_for_profile("auth-code")
    assert profile.provider == "google"
    assert profile.subject == "g-99"
    assert profile.email == "user@example.com"
    assert profile.name == "Test User"


@patch("app.services.github_oauth.httpx.Client")
@patch("app.services.github_oauth.get_settings")
def test_exchange_github_code_for_profile(mock_settings: MagicMock, mock_client_cls: MagicMock) -> None:
    mock_settings.return_value.github_client_id = "cid"
    mock_settings.return_value.github_client_secret = "secret"
    mock_settings.return_value.github_redirect_uri = "http://localhost/cb"

    mock_client = MagicMock()
    mock_client_cls.return_value.__enter__.return_value = mock_client

    token_res = MagicMock()
    token_res.status_code = 200
    token_res.json.return_value = {"access_token": "gh-token"}

    user_res = MagicMock()
    user_res.status_code = 200
    user_res.json.return_value = {"id": 4242, "email": None, "login": "octocat", "name": "Octo Cat"}

    emails_res = MagicMock()
    emails_res.status_code = 200
    emails_res.json.return_value = [
        {"email": "priv@users.noreply.github.com", "primary": True, "verified": True},
    ]

    mock_client.post.return_value = token_res
    mock_client.get.side_effect = [user_res, emails_res]

    profile = exchange_github_code_for_profile("auth-code")
    assert profile.provider == "github"
    assert profile.subject == "4242"
    assert profile.email == "priv@users.noreply.github.com"
    assert profile.name == "Octo Cat"


@patch("app.services.microsoft_oauth.get_settings")
def test_build_microsoft_authorize_url(mock_settings: MagicMock) -> None:
    mock_settings.return_value.microsoft_client_id = "ms-cid"
    mock_settings.return_value.microsoft_client_secret = "sec"
    mock_settings.return_value.microsoft_redirect_uri = "https://api.example/ms-cb"
    mock_settings.return_value.microsoft_tenant = "common"
    url = build_microsoft_authorize_url("state-xyz")
    assert "login.microsoftonline.com/common/oauth2/v2.0/authorize" in url
    assert "client_id=ms-cid" in url
    assert "state=state-xyz" in url
    assert "redirect_uri=https%3A%2F%2Fapi.example%2Fms-cb" in url


@patch("app.services.microsoft_oauth.httpx.Client")
@patch("app.services.microsoft_oauth.get_settings")
def test_exchange_microsoft_code_for_profile(mock_settings: MagicMock, mock_client_cls: MagicMock) -> None:
    mock_settings.return_value.microsoft_client_id = "cid"
    mock_settings.return_value.microsoft_client_secret = "secret"
    mock_settings.return_value.microsoft_redirect_uri = "http://localhost/cb"
    mock_settings.return_value.microsoft_tenant = "common"

    mock_client = MagicMock()
    mock_client_cls.return_value.__enter__.return_value = mock_client

    token_res = MagicMock()
    token_res.status_code = 200
    token_res.json.return_value = {"access_token": "ms-at"}

    me_res = MagicMock()
    me_res.status_code = 200
    me_res.json.return_value = {
        "id": "00000000-0000-0000-0000-00000000aa01",
        "mail": "User@Example.com",
        "displayName": "MS User",
    }

    mock_client.post.return_value = token_res
    mock_client.get.return_value = me_res

    profile = exchange_microsoft_code_for_profile("auth-code")
    assert profile.provider == "microsoft"
    assert profile.subject == "00000000-0000-0000-0000-00000000aa01"
    assert profile.email == "user@example.com"
    assert profile.name == "MS User"
