"""Resolve UI locale from API headers (X-Locale, Accept-Language)."""

from __future__ import annotations

import re

from fastapi import Request

_POLISH_RE = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]")
_SUPPORTED = frozenset({"en", "pl"})


def normalize_locale(value: str | None) -> str:
    """Map header/query locale to supported copy locale (en or pl)."""
    if not value:
        return "en"
    raw = value.strip().lower().replace("_", "-")
    if not raw:
        return "en"
    primary = raw.split(",")[0].split(";")[0].strip()
    tag = primary.split("-")[0]
    if tag in _SUPPORTED:
        return tag
    if primary.startswith("pl"):
        return "pl"
    return "en"


def resolve_request_locale(
    *,
    x_locale: str | None = None,
    accept_language: str | None = None,
) -> str:
    """Prefer explicit X-Locale; fall back to Accept-Language."""
    if x_locale and x_locale.strip():
        return normalize_locale(x_locale)
    return normalize_locale(accept_language)


def locale_from_request(request: Request) -> str:
    return resolve_request_locale(
        x_locale=request.headers.get("x-locale") or request.headers.get("X-Locale"),
        accept_language=request.headers.get("accept-language") or request.headers.get("Accept-Language"),
    )


def is_polish_locale(locale: str | None) -> bool:
    return normalize_locale(locale) == "pl"


def text_looks_polish(text: str) -> bool:
    return bool(_POLISH_RE.search(text or ""))
