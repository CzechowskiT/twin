"""Shared Playwright browser session with optional persisted login state."""

from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from app.automation.challenges import page_has_challenge, wait_for_human_clear
from app.scrapers.compliance import get_scrape_user_agent
from app.scrapers.playwright_utils import dismiss_cookies

STATE_FILE = "storage.json"


@contextmanager
def browser_page(*, headless: bool, state_dir: Path):
    from playwright.sync_api import sync_playwright

    state_dir.mkdir(parents=True, exist_ok=True)
    state_path = state_dir / STATE_FILE

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        context_kwargs: dict = {"locale": "pl-PL", "user_agent": get_scrape_user_agent()}
        if state_path.exists():
            context_kwargs["storage_state"] = str(state_path)
        context = browser.new_context(**context_kwargs)
        page = context.new_page()
        try:
            yield page, context
        finally:
            context.storage_state(path=str(state_path))
            context.close()
            browser.close()


def open_and_clear_challenges(
    page,
    url: str,
    *,
    headless: bool,
    challenge_timeout_ms: int = 180_000,
) -> tuple[bool, str]:
    page.goto(url, wait_until="domcontentloaded", timeout=90_000)
    dismiss_cookies(page)
    page.wait_for_timeout(1_500)
    if not page_has_challenge(page.content(), page.url):
        return True, ""
    if headless:
        return False, (
            "Portal wymaga weryfikacji „jesteś człowiekiem” (Cloudflare). "
            "Uruchom auto-apply lokalnie z widoczną przeglądarką."
        )
    wait_for_human_clear(page, timeout_ms=challenge_timeout_ms)
    if page_has_challenge(page.content(), page.url):
        return False, "Nie ukończono weryfikacji w czasie — zaznacz checkbox ręcznie w oknie przeglądarki."
    return True, ""
