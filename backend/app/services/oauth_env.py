"""Shared helpers for OAuth env vars (reject obvious placeholders)."""

from __future__ import annotations

_PLACEHOLDER_VALUES = frozenset(
    {
        "wklej_sekret",
        "paste_secret",
        "changeme",
        "change_me",
        "your_secret_here",
        "xxx",
        "todo",
    }
)


def oauth_secret_usable(value: str | None) -> bool:
    """True when a non-empty secret is set and not a documented placeholder."""
    v = (value or "").strip()
    if not v:
        return False
    if v.lower() in _PLACEHOLDER_VALUES:
        return False
    return True
