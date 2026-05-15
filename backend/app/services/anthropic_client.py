"""Anthropic Claude client for matching and form assistance."""

from anthropic import Anthropic

from app.config import get_settings


def get_anthropic_client() -> Anthropic | None:
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    return Anthropic(api_key=settings.anthropic_api_key)


def is_anthropic_configured() -> bool:
    return bool(get_settings().anthropic_api_key)
