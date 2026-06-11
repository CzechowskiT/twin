"""Google OAuth for Calendar API."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.config import Settings, get_settings
from app.services.calendar_oauth_redirect import effective_google_calendar_redirect_uri

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_CALENDAR_SCOPES = (
    "https://www.googleapis.com/auth/calendar.readonly "
    "https://www.googleapis.com/auth/calendar.events"
)


class GoogleCalendarOAuthError(Exception):
    pass


@dataclass(frozen=True)
class GoogleTokenRefreshResult:
    access_token: str
    expires_in: int
    refresh_token: str | None = None


@dataclass(frozen=True)
class GoogleTokenExchangeResult:
    access_token: str
    expires_in: int
    refresh_token: str | None
    email: str | None


def _redirect_uri(s: Settings | None = None) -> str:
    return effective_google_calendar_redirect_uri(s or get_settings())


def is_google_calendar_oauth_configured() -> bool:
    s = get_settings()
    return bool(s.google_client_id and s.google_client_secret and _redirect_uri(s))


def build_google_calendar_authorize_url(state: str) -> str:
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.google_client_id,
        "redirect_uri": _redirect_uri(s),
        "state": state,
        "scope": GOOGLE_CALENDAR_SCOPES.strip(),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_google_calendar_code(code: str) -> GoogleTokenExchangeResult:
    s = get_settings()
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": _redirect_uri(s),
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise GoogleCalendarOAuthError("Could not exchange Google Calendar authorization code")
        body = token_res.json()
        access_token = body.get("access_token")
        if not access_token:
            raise GoogleCalendarOAuthError("Google did not return an access token")
        email = None
        profile_res = client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if profile_res.status_code == 200 and profile_res.json().get("email"):
            email = str(profile_res.json()["email"]).lower()
    return GoogleTokenExchangeResult(
        access_token=str(access_token),
        expires_in=int(body.get("expires_in") or 3600),
        refresh_token=str(body["refresh_token"]) if body.get("refresh_token") else None,
        email=email,
    )


def refresh_google_calendar_tokens(refresh_token_plain: str) -> GoogleTokenRefreshResult:
    s = get_settings()
    with httpx.Client(timeout=30.0) as client:
        token_res = client.post(
            GOOGLE_TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token_plain,
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise GoogleCalendarOAuthError(f"Could not refresh Google Calendar access token: {token_res.text}")
        body = token_res.json()
        access = body.get("access_token")
        if not access:
            raise GoogleCalendarOAuthError("Google refresh did not return an access token")
        return GoogleTokenRefreshResult(
            access_token=str(access),
            expires_in=int(body.get("expires_in") or 3600),
            refresh_token=str(body["refresh_token"]) if body.get("refresh_token") else None,
        )


def refresh_google_calendar_access_token(refresh_token_plain: str) -> str:
    return refresh_google_calendar_tokens(refresh_token_plain).access_token
