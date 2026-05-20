"""Microsoft identity + Graph calendar OAuth (offline refresh token)."""

from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.config import get_settings

MS_AUTH_BASE = "https://login.microsoftonline.com"
MS_GRAPH_ME = "https://graph.microsoft.com/v1.0/me"
MS_CALENDAR_SCOPES = "offline_access User.Read Calendars.ReadWrite"


class MicrosoftCalendarOAuthError(Exception):
    """Misconfiguration or token exchange failure."""


def is_microsoft_calendar_oauth_configured() -> bool:
    s = get_settings()
    return bool(
        s.microsoft_client_id.strip()
        and s.microsoft_client_secret.strip()
        and s.microsoft_calendar_redirect_uri.strip()
    )


def _tenant_segment() -> str:
    t = (get_settings().microsoft_tenant or "common").strip() or "common"
    return t


def build_microsoft_calendar_authorize_url(state: str) -> str:
    if not is_microsoft_calendar_oauth_configured():
        raise MicrosoftCalendarOAuthError("Microsoft Calendar OAuth is not configured")
    s = get_settings()
    tenant = _tenant_segment()
    params = {
        "client_id": s.microsoft_client_id,
        "response_type": "code",
        "redirect_uri": s.microsoft_calendar_redirect_uri,
        "response_mode": "query",
        "scope": MS_CALENDAR_SCOPES,
        "state": state,
        "prompt": "consent",
    }
    return f"{MS_AUTH_BASE}/{tenant}/oauth2/v2.0/authorize?{urlencode(params)}"


def exchange_microsoft_calendar_code(code: str) -> tuple[str, str | None]:
    if not is_microsoft_calendar_oauth_configured():
        raise MicrosoftCalendarOAuthError("Microsoft Calendar OAuth is not configured")
    s = get_settings()
    tenant = _tenant_segment()
    data = {
        "client_id": s.microsoft_client_id,
        "client_secret": s.microsoft_client_secret,
        "code": code,
        "redirect_uri": s.microsoft_calendar_redirect_uri,
        "grant_type": "authorization_code",
        "scope": MS_CALENDAR_SCOPES,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            f"{MS_AUTH_BASE}/{tenant}/oauth2/v2.0/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise MicrosoftCalendarOAuthError("Could not exchange Microsoft authorization code")
        body = token_res.json()
        access_token = body.get("access_token")
        refresh_token = body.get("refresh_token") or ""
        if not access_token:
            raise MicrosoftCalendarOAuthError("Microsoft did not return an access token")
        profile_res = client.get(
            MS_GRAPH_ME,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email: str | None = None
        if profile_res.status_code == 200:
            raw = profile_res.json()
            if raw.get("mail"):
                email = str(raw["mail"]).lower()
            elif raw.get("userPrincipalName"):
                email = str(raw["userPrincipalName"]).lower()
    return str(refresh_token), email


def refresh_microsoft_calendar_access_token(refresh_token_plain: str) -> str:
    s = get_settings()
    tenant = _tenant_segment()
    data = {
        "client_id": s.microsoft_client_id,
        "client_secret": s.microsoft_client_secret,
        "refresh_token": refresh_token_plain,
        "grant_type": "refresh_token",
        "scope": MS_CALENDAR_SCOPES,
    }
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            f"{MS_AUTH_BASE}/{tenant}/oauth2/v2.0/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise MicrosoftCalendarOAuthError("Could not refresh Microsoft access token")
        access = token_res.json().get("access_token")
        if not access:
            raise MicrosoftCalendarOAuthError("Microsoft refresh did not return an access token")
        return str(access)
