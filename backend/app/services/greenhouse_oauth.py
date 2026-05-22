"""Greenhouse Harvest partner OAuth (authorization code grant)."""

from __future__ import annotations

import base64
from urllib.parse import urlencode

import httpx

from app.config import get_settings

GH_AUTH_URL = "https://auth.greenhouse.io/authorize"
GH_TOKEN_URL = "https://auth.greenhouse.io/token"
DEFAULT_SCOPES = "harvest:job_posts:list harvest:candidates:list"


class GreenhouseOAuthError(Exception):
    """Misconfiguration or token exchange failure."""


def is_greenhouse_oauth_configured() -> bool:
    s = get_settings()
    return bool(
        (s.greenhouse_client_id or "").strip()
        and (s.greenhouse_client_secret or "").strip()
        and (s.greenhouse_oauth_redirect_uri or "").strip()
    )


def greenhouse_oauth_scopes() -> str:
    raw = (get_settings().greenhouse_oauth_scopes or "").strip()
    return raw or DEFAULT_SCOPES


def build_greenhouse_authorize_url(*, state: str) -> str:
    if not is_greenhouse_oauth_configured():
        raise GreenhouseOAuthError("Greenhouse OAuth is not configured")
    s = get_settings()
    params = {
        "response_type": "code",
        "client_id": s.greenhouse_client_id.strip(),
        "redirect_uri": s.greenhouse_oauth_redirect_uri.strip(),
        "scope": greenhouse_oauth_scopes(),
        "state": state,
    }
    return f"{GH_AUTH_URL}?{urlencode(params)}"


def _basic_auth_header() -> str:
    s = get_settings()
    pair = f"{s.greenhouse_client_id.strip()}:{s.greenhouse_client_secret.strip()}"
    return "Basic " + base64.b64encode(pair.encode("utf-8")).decode("ascii")


def exchange_greenhouse_code(code: str) -> dict[str, str | int | None]:
    """Return access_token, refresh_token (optional), expires_in (optional)."""
    if not is_greenhouse_oauth_configured():
        raise GreenhouseOAuthError("Greenhouse OAuth is not configured")
    s = get_settings()
    params = {
        "grant_type": "authorization_code",
        "code": code.strip(),
        "redirect_uri": s.greenhouse_oauth_redirect_uri.strip(),
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(
            GH_TOKEN_URL,
            params=params,
            headers={
                "Authorization": _basic_auth_header(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        if res.status_code != 200:
            raise GreenhouseOAuthError("Could not exchange Greenhouse authorization code")
        body = res.json()
    access = body.get("access_token")
    if not access:
        raise GreenhouseOAuthError("Greenhouse did not return an access token")
    return {
        "access_token": str(access),
        "refresh_token": str(body["refresh_token"]) if body.get("refresh_token") else None,
        "expires_in": int(body["expires_in"]) if body.get("expires_in") is not None else None,
    }
