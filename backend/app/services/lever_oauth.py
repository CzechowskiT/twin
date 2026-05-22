"""Lever ATS OAuth placeholder — configure env to enable (MVP stub)."""

from __future__ import annotations

from app.config import get_settings


def is_lever_oauth_configured() -> bool:
    s = get_settings()
    return bool(
        (s.lever_client_id or "").strip()
        and (s.lever_client_secret or "").strip()
        and (s.lever_oauth_redirect_uri or "").strip()
    )


def build_lever_authorize_url(*, state: str) -> str:
    """Not wired to Lever API yet — reserved for partner credentials."""
    raise NotImplementedError("Lever OAuth authorize URL is not enabled in this build.")
