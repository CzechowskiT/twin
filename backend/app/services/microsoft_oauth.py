"""Microsoft Entra ID (Azure AD) OAuth2 sign-in — OpenID Connect via Graph."""

from __future__ import annotations

import os
from urllib.parse import urlencode

import httpx

from app.config import Settings, get_settings, _strip_trailing_slash_url
from app.services.oauth_types import OAuthUserProfile

MS_AUTH_BASE = "https://login.microsoftonline.com"
MS_GRAPH_ME = "https://graph.microsoft.com/v1.0/me"
MS_SIGNIN_SCOPES = "openid profile email User.Read"
_AUTH_CALLBACK_PATH = "/api/v1/auth/microsoft/callback"
_DEFAULT_API_BASE = "http://localhost:8000"


class MicrosoftOAuthError(Exception):
    """Microsoft sign-in misconfiguration or token exchange failure."""


def effective_microsoft_redirect_uri(settings: Settings | None = None) -> str:
    s = settings or get_settings()
    explicit = (os.getenv("MICROSOFT_REDIRECT_URI") or s.microsoft_redirect_uri or "").strip()
    if explicit:
        return _strip_trailing_slash_url(explicit)
    base = (s.api_url or _DEFAULT_API_BASE).strip().rstrip("/") or _DEFAULT_API_BASE
    return f"{base}{_AUTH_CALLBACK_PATH}"


def is_microsoft_configured() -> bool:
    s = get_settings()
    return bool(
        s.microsoft_client_id.strip()
        and s.microsoft_client_secret.strip()
        and effective_microsoft_redirect_uri(s)
    )


def _tenant_segment() -> str:
    t = (get_settings().microsoft_tenant or "common").strip() or "common"
    return t


def build_microsoft_authorize_url(state: str) -> str:
    if not is_microsoft_configured():
        raise MicrosoftOAuthError("Microsoft login is not configured")
    s = get_settings()
    tenant = _tenant_segment()
    params = {
        "client_id": s.microsoft_client_id,
        "response_type": "code",
        "redirect_uri": effective_microsoft_redirect_uri(s),
        "response_mode": "query",
        "scope": MS_SIGNIN_SCOPES,
        "state": state,
        "prompt": "select_account",
    }
    return f"{MS_AUTH_BASE}/{tenant}/oauth2/v2.0/authorize?{urlencode(params)}"


def exchange_microsoft_code_for_profile(code: str) -> OAuthUserProfile:
    if not is_microsoft_configured():
        raise MicrosoftOAuthError("Microsoft login is not configured")
    s = get_settings()
    tenant = _tenant_segment()
    redirect_uri = effective_microsoft_redirect_uri(s)
    data = {
        "client_id": s.microsoft_client_id,
        "client_secret": s.microsoft_client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
        "scope": MS_SIGNIN_SCOPES,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            f"{MS_AUTH_BASE}/{tenant}/oauth2/v2.0/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise MicrosoftOAuthError("Could not exchange Microsoft authorization code")
        access_token = token_res.json().get("access_token")
        if not access_token:
            raise MicrosoftOAuthError("Microsoft did not return an access token")

        profile_res = client.get(
            MS_GRAPH_ME,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code != 200:
            raise MicrosoftOAuthError("Could not load Microsoft profile")
        body = profile_res.json()

    sub = body.get("id")
    email = body.get("mail") or body.get("userPrincipalName")
    if not sub or not email:
        raise MicrosoftOAuthError("Microsoft profile missing id or email")

    name = body.get("displayName")
    return OAuthUserProfile(
        provider="microsoft",
        subject=str(sub),
        email=str(email).lower(),
        name=name,
    )
