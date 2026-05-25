"""Just Join IT (justjoin.it) — load public offers JSON from the same origin in Playwright."""

import json
from typing import Any

from app.scrapers.base import ScrapedJob, validate_job
from app.scrapers.compliance import assert_url_may_be_fetched, get_scrape_user_agent, post_fetch_delay
from app.scrapers.playwright_utils import dismiss_cookies

JOB_BOARD = "justjoin.it"
BASE = "https://justjoin.it"


def _as_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _fetch_offers_json_text() -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    home = f"{BASE}/"
    if not assert_url_may_be_fetched(home):
        return ""

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(locale="pl-PL", user_agent=get_scrape_user_agent())
        page = context.new_page()
        page.goto(f"{BASE}/", wait_until="domcontentloaded", timeout=90_000)
        dismiss_cookies(page)
        page.wait_for_timeout(1_800)
        raw = page.evaluate(
            """async () => {
              try {
                const r = await fetch('/api/offers');
                if (!r.ok) return '';
                const t = await r.text();
                return t.length > 8_000_000 ? t.slice(0, 8_000_000) : t;
              } catch {
                return '';
              }
            }"""
        )
        context.close()
        browser.close()
    post_fetch_delay()
    return raw if isinstance(raw, str) else ""


def _iter_offer_dicts(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        for key in ("data", "offers", "items", "results"):
            block = payload.get(key)
            if isinstance(block, list):
                return [x for x in block if isinstance(x, dict)]
    return []


def _job_from_offer(obj: dict[str, Any]) -> ScrapedJob | None:
    oid = obj.get("id")
    if oid is None:
        return None
    eid = str(oid).strip()
    title = str(obj.get("title") or "").strip()
    if not title or not eid:
        return None

    company = obj.get("company_name")
    if not company and isinstance(obj.get("company"), dict):
        c = obj["company"]
        company = c.get("company_name") or c.get("name")
    company = str(company or "").strip() or "Just Join IT"

    slug = str(obj.get("slug") or "").strip()
    if slug:
        url = f"{BASE}/offers/{slug}"
    else:
        url = f"{BASE}/offers/{eid}"

    city = obj.get("city")
    street = obj.get("street")
    loc_parts = [str(x).strip() for x in (street, city) if x]
    location = ", ".join(loc_parts) if loc_parts else None

    et = obj.get("employment_types")
    smin = smax = None
    if isinstance(et, list) and et and isinstance(et[0], dict):
        smin = _as_int(et[0].get("from"))
        smax = _as_int(et[0].get("to"))
    if smin is None:
        smin = _as_int(obj.get("salary_from"))
    if smax is None:
        smax = _as_int(obj.get("salary_to"))

    return ScrapedJob(
        job_board=JOB_BOARD,
        external_id=eid[:120],
        title=title[:500],
        company=company[:300],
        url=url.split("?", 1)[0],
        location=location,
        salary_min=smin,
        salary_max=smax,
    )


def scrape_justjoin(limit: int = 2500) -> list[ScrapedJob]:
    raw = _fetch_offers_json_text()
    if not raw.strip():
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return []

    out: list[ScrapedJob] = []
    for obj in _iter_offer_dicts(payload):
        if len(out) >= limit:
            break
        job = _job_from_offer(obj)
        if job and validate_job(job):
            out.append(job)
    return out
