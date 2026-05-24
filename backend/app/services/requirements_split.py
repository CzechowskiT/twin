"""Deterministic must-have vs nice-to-have requirements parser (MVP)."""

from __future__ import annotations

import re

_NICE_HEADERS = (
    r"nice\s+to\s+have",
    r"mile\s+widziane",
    r"atut(?:em)?",
    r"plus(?:em)?",
    r"optional",
)
_MUST_HEADERS = (
    r"must[\-\s]have",
    r"wymagane",
    r"wymagania",
    r"requirements",
    r"obowi[aą]zkowe",
    r"minimum",
)


def split_requirements(text: str | None) -> tuple[list[str], list[str]]:
    """Split raw requirements blob into must-have and nice-to-have bullet lists."""
    if not text or not text.strip():
        return [], []

    must: list[str] = []
    nice: list[str] = []
    section = "must"
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()
        if _matches_header(lower, _NICE_HEADERS):
            section = "nice"
            continue
        if _matches_header(lower, _MUST_HEADERS):
            section = "must"
            continue
        bullet = _as_bullet(stripped)
        if not bullet:
            continue
        (nice if section == "nice" else must).append(bullet)

    if not must and not nice:
        return _fallback_bullets(text), []
    return must, nice


def _matches_header(line: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pat, line) for pat in patterns)


def _as_bullet(line: str) -> str | None:
    cleaned = re.sub(r"^[\-\*•●]\s*", "", line).strip()
    cleaned = re.sub(r"^\d+[\.\)]\s*", "", cleaned).strip()
    return cleaned if len(cleaned) >= 3 else None


def _fallback_bullets(text: str) -> list[str]:
    bullets: list[str] = []
    for line in text.splitlines():
        b = _as_bullet(line.strip())
        if b:
            bullets.append(b)
    if bullets:
        return bullets
    return [text.strip()[:500]]
