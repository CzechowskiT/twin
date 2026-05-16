"""Fill common application form fields from candidate data."""

from __future__ import annotations

from pathlib import Path

FIELD_SELECTORS = (
    'input[name*="first" i]',
    'input[name*="imie" i]',
    'input[name="name"]',
    'input[autocomplete="given-name"]',
)
EMAIL_SELECTORS = ('input[type="email"]', 'input[name*="mail" i]')
PHONE_SELECTORS = ('input[type="tel"]', 'input[name*="phone" i]', 'input[name*="telefon" i]')
FILE_SELECTORS = ('input[type="file"]',)


def fill_if_empty(page, selectors: tuple[str, ...], value: str) -> None:
    if not value:
        return
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if loc.count() == 0 or not loc.is_visible():
                continue
            if str(loc.input_value() or "").strip():
                return
            loc.fill(value)
            return
        except Exception:
            continue


def attach_cv(page, resume_path: str | None) -> bool:
    if not resume_path or not Path(resume_path).is_file():
        return False
    for sel in FILE_SELECTORS:
        loc = page.locator(sel).first
        if loc.count() and loc.is_visible():
            loc.set_input_files(resume_path)
            return True
    return False


def click_first(page, selectors: tuple[str, ...]) -> bool:
    for sel in selectors:
        loc = page.locator(sel).first
        if loc.count() and loc.is_visible():
            loc.click()
            return True
    return False
