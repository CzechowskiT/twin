"""GitHub OAuth2 sign-in (user:email scope)."""

from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.services.oauth_types import OAuthUserProfile

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"
GITHUB_SCOPES = "read:user user:email"


class GitHubOAuthError(Exception):
    """GitHub OAuth configuration or API failure."""


def is_github_configured() -> bool:
    s = get_settings()
    return bool(s.github_client_id and s.github_client_secret and s.github_redirect_uri)


def build_github_authorize_url(state: str) -> str:
    if not is_github_configured():
        raise GitHubOAuthError("GitHub login is not configured")
    s = get_settings()
    params = {
        "client_id": s.github_client_id,
        "redirect_uri": s.github_redirect_uri,
        "state": state,
        "scope": GITHUB_SCOPES,
    }
    return f"{GITHUB_AUTH_URL}?{urlencode(params)}"


def _pick_github_email(emails: list) -> str | None:
    primary_verified = next(
        (
            e
            for e in emails
            if isinstance(e, dict) and e.get("primary") and e.get("verified") and e.get("email")
        ),
        None,
    )
    if primary_verified:
        return str(primary_verified["email"]).lower()
    verified = next((e for e in emails if isinstance(e, dict) and e.get("verified") and e.get("email")), None)
    if verified:
        return str(verified["email"]).lower()
    first = next((e for e in emails if isinstance(e, dict) and e.get("email")), None)
    return str(first["email"]).lower() if first else None


def exchange_github_code_for_profile(code: str) -> OAuthUserProfile:
    if not is_github_configured():
        raise GitHubOAuthError("GitHub login is not configured")
    s = get_settings()
    data = {
        "client_id": s.github_client_id,
        "client_secret": s.github_client_secret,
        "code": code,
        "redirect_uri": s.github_redirect_uri,
    }
    headers = {"Accept": "application/json"}
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(GITHUB_TOKEN_URL, data=data, headers=headers)
        if token_res.status_code != 200:
            raise GitHubOAuthError("Could not exchange GitHub authorization code")
        token_body = token_res.json()
        access_token = token_body.get("access_token")
        if not access_token:
            raise GitHubOAuthError("GitHub did not return an access token")

        auth = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_res = client.get(GITHUB_USER_URL, headers=auth)
        if user_res.status_code != 200:
            raise GitHubOAuthError("Could not load GitHub user")
        user_body = user_res.json()
        sub = user_body.get("id")
        if sub is None:
            raise GitHubOAuthError("GitHub profile missing id")

        email = user_body.get("email")
        if not email:
            emails_res = client.get(GITHUB_EMAILS_URL, headers=auth)
            if emails_res.status_code != 200:
                raise GitHubOAuthError("Could not load GitHub emails")
            email = _pick_github_email(emails_res.json())
        if not email:
            raise GitHubOAuthError("GitHub profile missing verified email (check user:email scope)")

        name = user_body.get("name") or user_body.get("login")
        return OAuthUserProfile(
            provider="github",
            subject=str(sub),
            email=str(email).lower(),
            name=name,
        )
