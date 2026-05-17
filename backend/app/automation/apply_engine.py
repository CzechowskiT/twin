"""Route auto-apply to the correct job board handler."""

from __future__ import annotations

from pathlib import Path

from app.automation.apply_pracuj import apply_pracuj
from app.automation.types import ApplyOutcome, ApplyResult

PRACUJ_BOARDS = frozenset({"pracuj.pl", "pracuj"})
INDEED_LIKE = frozenset({"indeed.com", "indeed"})


def run_auto_apply(
    *,
    job_board: str,
    job_url: str,
    name: str,
    email: str,
    phone: str,
    resume_path: str | None,
    motivation_text: str | None = None,
    headless: bool,
    state_dir: Path,
    submit: bool,
) -> ApplyResult:
    board = job_board.lower().strip()
    if board in PRACUJ_BOARDS or "pracuj.pl" in job_url:
        return apply_pracuj(
            job_url,
            name=name,
            email=email,
            phone=phone,
            resume_path=resume_path,
            motivation_text=motivation_text,
            headless=headless,
            state_dir=state_dir,
            submit=submit,
        )
    if board in INDEED_LIKE or "indeed.com" in job_url:
        return _apply_with_challenge_handoff(
            job_url,
            name=name,
            email=email,
            phone=phone,
            resume_path=resume_path,
            motivation_text=motivation_text,
            headless=headless,
            state_dir=state_dir,
            submit=submit,
        )
    return ApplyResult(
        ApplyOutcome.UNSUPPORTED,
        f"Auto-apply nie obsługuje jeszcze portalu „{job_board}”. Użyj Aplikuj (ręcznie).",
    )


def _apply_with_challenge_handoff(
    job_url: str,
    *,
    name: str,
    email: str,
    phone: str,
    resume_path: str | None,
    motivation_text: str | None,
    headless: bool,
    state_dir: Path,
    submit: bool,
) -> ApplyResult:
    """Indeed: open page, wait for human on Cloudflare, then best-effort apply click."""
    from app.automation.browser import browser_page, open_and_clear_challenges
    from app.automation.form_fill import attach_cv, click_first, fill_if_empty, fill_motivation_textareas

    apply_btns = (
        'button:has-text("Apply")',
        'a:has-text("Apply now")',
        'button:has-text("Aplikuj")',
    )
    with browser_page(headless=headless, state_dir=state_dir) as (page, _ctx):
        ok, msg = open_and_clear_challenges(page, job_url, headless=headless)
        if not ok:
            return ApplyResult(ApplyOutcome.NEEDS_HUMAN, msg)
        if not click_first(page, apply_btns):
            return ApplyResult(
                ApplyOutcome.NEEDS_HUMAN,
                "Indeed: zaloguj się i kliknij Apply w otwartym oknie przeglądarki.",
            )
        page.wait_for_timeout(2_000)
        fill_if_empty(page, ('input[type="email"]',), email)
        fill_if_empty(page, ('input[name*="name" i]',), name)
        attach_cv(page, resume_path)
        fill_motivation_textareas(page, motivation_text)
        if submit and click_first(page, ('button[type="submit"]',)):
            return ApplyResult(ApplyOutcome.SUBMITTED, "Indeed: wysłano (jeśli formularz był prosty).")
        return ApplyResult(
            ApplyOutcome.FORM_FILLED,
            "Indeed: formularz częściowo wypełniony — dokończ w przeglądarce.",
        )
