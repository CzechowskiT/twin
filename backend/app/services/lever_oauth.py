"""Lever ATS OAuth stub framework — mirrors Greenhouse authorize/token shape.

Authorize URL is buildable when env is set; token exchange remains partner-gated.
Live ATS write still requires ``ATS_LIVE_SYNC`` (see ``ats_sync_service``).
"""

from __future__ import annotations

from urllib.parse import urlencode

from app.config import get_settings

LEVER_AUTH_URL = "https://auth.lever.co/authorize"
LEVER_TOKEN_URL = "https://auth.lever.co/oauth/token"
DEFAULT_SCOPES = "offline_access opportunities:write:admin postings:read:admin"


class LeverOAuthError(Exception):
    """Misconfiguration or token exchange failure."""


def is_lever_oauth_configured() -> bool:
    s = get_settings()
    return bool(
        (s.lever_client_id or "").strip()
        and (s.lever_client_secret or "").strip()
        and (s.lever_oauth_redirect_uri or "").strip()
    )


def lever_oauth_scopes() -> str:
    raw = (getattr(get_settings(), "lever_oauth_scopes", None) or "").strip()
    return raw or DEFAULT_SCOPES


def build_lever_authorize_url(*, state: str) -> str:
    """Build Lever authorize URL when partner credentials are configured."""
    if not is_lever_oauth_configured():
        raise LeverOAuthError("Lever OAuth is not configured")
    s = get_settings()
    params = {
        "client_id": s.lever_client_id.strip(),
        "redirect_uri": s.lever_oauth_redirect_uri.strip(),
        "state": state,
        "response_type": "code",
        "scope": lever_oauth_scopes(),
        "audience": "https://api.lever.co/v1/",
    }
    return f"{LEVER_AUTH_URL}?{urlencode(params)}"


def exchange_lever_code(code: str) -> dict[str, str | int | None]:
    """Token exchange stub — raises until partner credentials + HTTP client are verified."""
    if not is_lever_oauth_configured():
        raise LeverOAuthError("Lever OAuth is not configured")
    _ = (code or "").strip()
    raise LeverOAuthError(
        "Lever token exchange not wired for production — use dry-run sync evidence until partner go-live"
    )
