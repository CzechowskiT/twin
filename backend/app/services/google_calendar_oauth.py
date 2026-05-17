"""Google OAuth for Calendar API (separate redirect from web login; offline refresh token)."""

from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.config import get_settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
# Free/busy reads calendars; events scope manages interview blocks on primary calendar.
GOOGLE_CALENDAR_SCOPES = (
    "https://www.googleapis.com/auth/calendar.readonly "
    "https://www.googleapis.com/auth/calendar.events"
)


class GoogleCalendarOAuthError(Exception):
    """Misconfiguration or token exchange failure."""


def is_google_calendar_oauth_configured() -> bool:
    s = get_settings()
    return bool(
        s.google_client_id
        and s.google_client_secret
        and s.google_calendar_redirect_uri.strip()
    )


def build_google_calendar_authorize_url(state: str) -> str:
    if not is_google_calendar_oauth_configured():
        raise GoogleCalendarOAuthError("Google Calendar OAuth is not configured")
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.google_client_id,
        "redirect_uri": s.google_calendar_redirect_uri,
        "state": state,
        "scope": GOOGLE_CALENDAR_SCOPES.strip(),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_google_calendar_code(code: str) -> tuple[str, str | None]:
    """Return (refresh_token or empty string if missing, google email from userinfo)."""
    if not is_google_calendar_oauth_configured():
        raise GoogleCalendarOAuthError("Google Calendar OAuth is not configured")
    s = get_settings()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": s.google_calendar_redirect_uri,
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
            raise GoogleCalendarOAuthError("Could not exchange Google Calendar authorization code")
        body = token_res.json()
        access_token = body.get("access_token")
        refresh_token = body.get("refresh_token") or ""
        if not access_token:
            raise GoogleCalendarOAuthError("Google did not return an access token")

        profile_res = client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        email: str | None = None
        if profile_res.status_code == 200:
            raw = profile_res.json()
            if raw.get("email"):
                email = str(raw["email"]).lower()

    return str(refresh_token), email


def refresh_google_calendar_access_token(refresh_token_plain: str) -> str:
    s = get_settings()
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token_plain,
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
            raise GoogleCalendarOAuthError("Could not refresh Google Calendar access token")
        access = token_res.json().get("access_token")
        if not access:
            raise GoogleCalendarOAuthError("Google refresh did not return an access token")
        return str(access)
