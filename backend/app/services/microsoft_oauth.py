"""Microsoft Entra ID OAuth 2.0 v2 (multitenant `common` by default)."""

from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.services.oauth_types import OAuthUserProfile

# Delegated permissions for sign-in + Graph profile (email / UPN).
MICROSOFT_SCOPES = "openid profile email User.Read"


class MicrosoftOAuthError(Exception):
    """Microsoft OAuth configuration or API failure."""


def _tenant_authority() -> str:
    s = get_settings()
    tenant = (s.microsoft_tenant or "common").strip() or "common"
    return f"https://login.microsoftonline.com/{tenant}"


def is_microsoft_configured() -> bool:
    s = get_settings()
    return bool(s.microsoft_client_id and s.microsoft_client_secret and s.microsoft_redirect_uri)


def build_microsoft_authorize_url(state: str) -> str:
    if not is_microsoft_configured():
        raise MicrosoftOAuthError("Microsoft login is not configured")
    s = get_settings()
    base = _tenant_authority()
    params = {
        "client_id": s.microsoft_client_id,
        "response_type": "code",
        "redirect_uri": s.microsoft_redirect_uri,
        "response_mode": "query",
        "scope": MICROSOFT_SCOPES,
        "state": state,
        "prompt": "select_account",
    }
    return f"{base}/oauth2/v2.0/authorize?{urlencode(params)}"


def _resolve_graph_email(body: dict) -> str | None:
    mail = body.get("mail")
    if isinstance(mail, str) and "@" in mail:
        return mail.strip().lower()
    upn = body.get("userPrincipalName")
    if isinstance(upn, str) and "@" in upn:
        return upn.strip().lower()
    other = body.get("otherMails")
    if isinstance(other, list) and other:
        first = other[0]
        if isinstance(first, str) and "@" in first:
            return first.strip().lower()
    return None


def exchange_microsoft_code_for_profile(code: str) -> OAuthUserProfile:
    if not is_microsoft_configured():
        raise MicrosoftOAuthError("Microsoft login is not configured")
    s = get_settings()
    token_url = f"{_tenant_authority()}/oauth2/v2.0/token"
    data = {
        "client_id": s.microsoft_client_id,
        "client_secret": s.microsoft_client_secret,
        "code": code,
        "redirect_uri": s.microsoft_redirect_uri,
        "grant_type": "authorization_code",
        "scope": MICROSOFT_SCOPES,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise MicrosoftOAuthError("Could not exchange Microsoft authorization code")
        token_json = token_res.json()
        access_token = token_json.get("access_token")
        if not access_token:
            raise MicrosoftOAuthError("Microsoft did not return an access token")

        me_res = client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if me_res.status_code != 200:
            raise MicrosoftOAuthError("Could not load Microsoft profile from Graph")
        body = me_res.json()

    oid = body.get("id")
    email = _resolve_graph_email(body)
    if not oid or not email:
        raise MicrosoftOAuthError("Microsoft profile missing id or usable email")

    name = body.get("displayName")
    return OAuthUserProfile(
        provider="microsoft",
        subject=str(oid),
        email=email,
        name=str(name).strip() if isinstance(name, str) else None,
    )
