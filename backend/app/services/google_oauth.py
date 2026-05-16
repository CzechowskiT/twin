"""Google OAuth2 / OpenID Connect sign-in."""

from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.services.oauth_types import OAuthUserProfile

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_SCOPES = "openid email profile"


class GoogleOAuthError(Exception):
    """Google OAuth configuration or API failure."""


def is_google_configured() -> bool:
    s = get_settings()
    return bool(s.google_client_id and s.google_client_secret and s.google_redirect_uri)


def build_google_authorize_url(state: str) -> str:
    if not is_google_configured():
        raise GoogleOAuthError("Google login is not configured")
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.google_client_id,
        "redirect_uri": s.google_redirect_uri,
        "state": state,
        "scope": GOOGLE_SCOPES,
        "access_type": "online",
        "include_granted_scopes": "true",
        "prompt": "select_account",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_google_code_for_profile(code: str) -> OAuthUserProfile:
    if not is_google_configured():
        raise GoogleOAuthError("Google login is not configured")
    s = get_settings()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": s.google_redirect_uri,
        "client_id": s.google_client_id,
        "client_secret": s.google_client_secret,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            GOOGLE_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise GoogleOAuthError("Could not exchange Google authorization code")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise GoogleOAuthError("Google did not return an access token")

        profile_res = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code != 200:
            raise GoogleOAuthError("Could not load Google profile")
        body = profile_res.json()

    sub = body.get("sub")
    email = body.get("email")
    if not sub or not email:
        raise GoogleOAuthError("Google profile missing sub or email")

    name = body.get("name") or body.get("given_name")
    return OAuthUserProfile(
        provider="google",
        subject=str(sub),
        email=str(email).lower(),
        name=name,
    )
