"""Detect bot challenges (Cloudflare Turnstile) and wait for a human."""

from __future__ import annotations

import re

CHALLENGE_PATTERNS = re.compile(
    r"(cloudflare|turnstile|cf-challenge|"
    r"potwierdź, że jesteś człowiekiem|"
    r"verify you are human|"
    r"wymagana dodatkowa weryfikacja)",
    re.I,
)


def page_has_challenge(html: str, url: str) -> bool:
    blob = f"{url}\n{html[:50_000]}"
    return bool(CHALLENGE_PATTERNS.search(blob))


def wait_for_human_clear(page, *, timeout_ms: int = 180_000) -> bool:
    """Wait until challenge UI disappears (user must solve it in visible browser)."""
    try:
        page.wait_for_function(
            """() => {
                const text = document.body?.innerText || '';
                const blocked = /cloudflare|turnstile|człowiekiem|verify you are human/i.test(text);
                const iframe = document.querySelector('iframe[src*="challenges.cloudflare"]');
                return !blocked && !iframe;
            }""",
            timeout=timeout_ms,
        )
        return True
    except Exception:
        return False
