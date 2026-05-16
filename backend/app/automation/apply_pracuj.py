"""Auto-apply flow for Pracuj.pl offers."""

from __future__ import annotations

from app.automation.browser import browser_page, open_and_clear_challenges
from app.automation.form_fill import attach_cv, click_first, fill_if_empty
from app.automation.types import ApplyOutcome, ApplyResult

APPLY_SELECTORS = (
    'button[data-test="apply-button"]',
    'a[data-test="apply-button"]',
    'button:has-text("Aplikuj")',
    'a:has-text("Aplikuj")',
    'button:has-text("Aplikuj teraz")',
)
SUBMIT_SELECTORS = (
    'button[type="submit"]:has-text("Wyślij")',
    'button[type="submit"]:has-text("Aplikuj")',
    'button[data-test="submit-button"]',
    'button[type="submit"]',
)


def apply_pracuj(
    job_url: str,
    *,
    name: str,
    email: str,
    phone: str,
    resume_path: str | None,
    headless: bool,
    state_dir,
    submit: bool,
) -> ApplyResult:
    first_name = name.split()[0] if name else ""
    with browser_page(headless=headless, state_dir=state_dir) as (page, _ctx):
        ok, msg = open_and_clear_challenges(page, job_url, headless=headless)
        if not ok:
            return ApplyResult(ApplyOutcome.NEEDS_HUMAN, msg)

        if not click_first(page, APPLY_SELECTORS):
            return ApplyResult(
                ApplyOutcome.FAILED,
                "Nie znaleziono przycisku Aplikuj — oferta może wymagać konta Pracuj.pl.",
            )
        page.wait_for_timeout(2_000)

        fill_if_empty(page, ('input[name*="first" i]', 'input[autocomplete="given-name"]'), first_name)
        fill_if_empty(page, ('input[name*="last" i]', 'input[autocomplete="family-name"]'), _last_name(name))
        fill_if_empty(page, ('input[type="email"]',), email)
        fill_if_empty(page, ('input[type="tel"]', 'input[name*="telefon" i]'), phone)
        attach_cv(page, resume_path)

        if not submit:
            return ApplyResult(
                ApplyOutcome.FORM_FILLED,
                "Formularz wypełniony — sprawdź okno przeglądarki i wyślij ręcznie.",
            )

        if click_first(page, SUBMIT_SELECTORS):
            page.wait_for_timeout(2_500)
            return ApplyResult(ApplyOutcome.SUBMITTED, "Aplikacja wysłana na Pracuj.pl.")

        return ApplyResult(
            ApplyOutcome.FORM_FILLED,
            "Wypełniono pola — brak przycisku wysyłki (różny formularz pracodawcy).",
        )


def _last_name(full: str) -> str:
    parts = full.split()
    return " ".join(parts[1:]) if len(parts) > 1 else ""
