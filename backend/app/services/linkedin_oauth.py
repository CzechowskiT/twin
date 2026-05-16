"""LinkedIn OpenID Connect sign-in."""

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.core.security import create_access_token, decode_access_token

LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
SCOPES = "openid profile email"


class LinkedInOAuthError(Exception):
    """LinkedIn OAuth configuration or API failure."""


@dataclass(frozen=True)
class LinkedInProfile:
    linkedin_id: str
    email: str
    name: str | None


def is_linkedin_credentials_configured() -> bool:
    """True when LinkedIn app credentials are set (status UI and login guard)."""
    s = get_settings()
    return bool(s.linkedin_client_id and s.linkedin_client_secret)


def is_linkedin_oauth_configured() -> bool:
    s = get_settings()
    return is_linkedin_credentials_configured() and bool(s.linkedin_redirect_uri)


def build_authorize_url(state: str) -> str:
    if not is_linkedin_oauth_configured():
        raise LinkedInOAuthError("LinkedIn login is not configured")
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.linkedin_client_id,
        "redirect_uri": s.linkedin_redirect_uri,
        "state": state,
        "scope": SCOPES,
    }
    return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"


def create_oauth_state() -> str:
    return create_access_token("__linkedin_oauth_state__")


def verify_oauth_state(state: str) -> bool:
    return decode_access_token(state) == "__linkedin_oauth_state__"


def exchange_code_for_profile(code: str) -> LinkedInProfile:
    if not is_linkedin_oauth_configured():
        raise LinkedInOAuthError("LinkedIn login is not configured")
    s = get_settings()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": s.linkedin_redirect_uri,
        "client_id": s.linkedin_client_id,
        "client_secret": s.linkedin_client_secret,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            LINKEDIN_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise LinkedInOAuthError("Could not exchange LinkedIn authorization code")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise LinkedInOAuthError("LinkedIn did not return an access token")

        profile_res = client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code != 200:
            raise LinkedInOAuthError("Could not load LinkedIn profile")
        body = profile_res.json()

    sub = body.get("sub")
    email = body.get("email")
    if not sub or not email:
        raise LinkedInOAuthError("LinkedIn profile missing email (check app permissions)")

    name = body.get("name") or body.get("given_name")
    return LinkedInProfile(linkedin_id=str(sub), email=str(email).lower(), name=name)
