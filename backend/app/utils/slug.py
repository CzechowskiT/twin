"""URL-safe slugs for public branding paths."""

from __future__ import annotations

import re


def slugify_company(name: str) -> str:
    """Lowercase ASCII slug for employer attest URLs (display only; auth still via token)."""
    s = (name or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")[:80] or "company"
