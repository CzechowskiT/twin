"""LinkedIn public job search scraper (Playwright + BeautifulSoup).

MVP uses unauthenticated search only. LinkedIn may block headless browsers,
show login walls, or rate-limit requests — results are best-effort.

Do NOT commit credentials. For future login support use env vars only.
Scraping may conflict with LinkedIn Terms; production at scale should prefer
official hiring APIs where you have a commercial relationship.
"""

from __future__ import annotations

import random
import re
from urllib.parse import quote_plus, urljoin, urlparse

from bs4 import BeautifulSoup

from app.config import get_settings
from app.scrapers.base import ScrapedJob, validate_job
from app.scrapers.playwright_utils import USER_AGENT, dismiss_cookies

JOB_BOARD = "linkedin.com"
BASE_URL = "https://www.linkedin.com"
JOB_ID_RE = re.compile(r"-(\d{7,})(?:\?|$)")
CARD_SELECTORS = (
    ".job-search-card, "
    "li.jobs-search-results__list-item, "
    ".job-card-container, "
    "li[data-occludable-job-id]"
)


class LinkedInScrapeError(Exception):
    """Raised when LinkedIn blocks or returns no parseable results."""


def scrape_linkedin(
    keyword: str = "sales",
    location: str = "Warsaw, Poland",
    limit: int = 20,
) -> list[ScrapedJob]:
    """Scrape public LinkedIn job search results."""
    html = _fetch_search_html(keyword, location)
    if _is_blocked_page(html):
        raise LinkedInScrapeError(
            "LinkedIn blocked or requires login. Try again later or use pracuj.pl / rocketjobs.pl."
        )
    jobs = _parse_listing_html(html, limit)
    validated = [j for j in jobs if validate_job(j)]
    if not validated and html:
        raise LinkedInScrapeError(
            "No LinkedIn jobs parsed. The page layout may have changed or access was limited."
        )
    return validated


def scrape_linkedin_sales(limit: int = 20) -> list[ScrapedJob]:
    """Sales-focused LinkedIn search for commercial profiles."""
    return scrape_linkedin(keyword="sales", location="Warsaw, Poland", limit=limit)


def _build_search_url(keyword: str, location: str, *, geo_id: str) -> str:
    """Public jobs search URL: fresh posts + date sort + optional geoId."""
    kw = quote_plus(keyword.strip())
    loc = quote_plus(location.strip())
    parts = [
        f"{BASE_URL}/jobs/search/",
        f"?keywords={kw}",
        f"&location={loc}",
        "&f_TPR=r604800",
        "&sortBy=DD",
    ]
    gid = geo_id.strip()
    if gid.isdigit():
        parts.append(f"&geoId={gid}")
    return "".join(parts)


def _fetch_search_html(keyword: str, location: str) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    settings = get_settings()
    url = _build_search_url(keyword, location, geo_id=settings.linkedin_jobs_geo_id)

    init_js = """
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=settings.linkedin_jobs_browser_headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(
            locale="en-US",
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 900},
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
            },
        )
        context.add_init_script(init_js)
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        dismiss_cookies(page)
        _dismiss_linkedin_gdpr_banner(page)
        _wait_for_job_listing(page)
        _scroll_results(page)
        html = page.content()
        browser.close()
    return html


def _dismiss_linkedin_gdpr_banner(page) -> None:
    """LinkedIn-specific consent outside common OneTrust patterns."""
    for selector in (
        'button[action-type="ACCEPT"]',
        'button:has-text("Accept cookies")',
        'button:has-text("Reject optional cookies")',
    ):
        try:
            btn = page.locator(selector).first
            if btn.is_visible(timeout=1_200):
                btn.click()
                page.wait_for_timeout(400)
                return
        except Exception:
            continue


def _wait_for_job_listing(page) -> None:
    selectors = (
        ".job-search-card",
        ".jobs-search-results__list-item",
        ".job-card-container",
        "a[href*='/jobs/view/']",
    )
    for sel in selectors:
        try:
            page.wait_for_selector(sel, timeout=22_000)
            return
        except Exception:
            continue


def _scroll_results(page) -> None:
    page.wait_for_timeout(2_000)
    listing_sel = (
        ".job-search-card, li.jobs-search-results__list-item, "
        ".job-card-container, li[data-occludable-job-id]"
    )
    try:
        page.wait_for_selector(listing_sel, timeout=5_000)
    except Exception:
        pass
    rounds = 6
    for _ in range(rounds):
        page.evaluate(
            """() => {
            const el = document.querySelector('.jobs-search-results-list')
                || document.querySelector('.scaffold-layout__list')
                || document.querySelector('.jobs-search-results-list-container');
            if (el) el.scrollTop = el.scrollHeight;
            else window.scrollTo(0, document.body.scrollHeight);
        }"""
        )
        page.wait_for_timeout(700 + random.randint(0, 900))


def _has_listing_signals(html: str) -> bool:
    if not html:
        return False
    l = html.lower()
    markers = (
        "job-search-card",
        "jobs-search-results__list-item",
        "job-card-container",
        "data-occludable-job-id",
        "/jobs/view/",
    )
    return any(m in l for m in markers)


def _is_blocked_page(html: str) -> bool:
    if _has_listing_signals(html):
        return False
    if not html or len(html) < 2_000:
        return True
    l = html.lower()
    needles = (
        "authwall",
        "linkedin.com/authwall",
        "checkpoint/challenge",
        "interstitial/captcha",
        "unusual traffic",
        "security check",
        "let’s get you signed in",
        "let's get you signed in",
        "sign in to view",
        "join linkedin",
    )
    return any(n in l for n in needles)


def _parse_listing_html(html: str, limit: int) -> list[ScrapedJob]:
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for card in soup.select(CARD_SELECTORS):
        if len(results) >= limit:
            break
        job = _parse_job_card(card)
        if not job or job.external_id in seen:
            continue
        seen.add(job.external_id)
        results.append(job)

    if not results:
        for anchor in soup.select("a[href*='jobs/view']"):
            if len(results) >= limit:
                break
            job = _parse_job_anchor(anchor)
            if not job or job.external_id in seen:
                continue
            seen.add(job.external_id)
            results.append(job)

    return results


def _parse_job_card(card) -> ScrapedJob | None:
    anchor = card.select_one("a[href*='jobs/view']")
    if not anchor:
        return None
    return _parse_job_anchor(anchor, card)


def _parse_job_anchor(anchor, card=None) -> ScrapedJob | None:
    href = anchor.get("href", "").strip()
    if not href:
        return None

    url = _canonical_job_url(href)
    external_id = _external_id_from_url(url)
    if not external_id:
        return None

    root = card or anchor
    title_el = root.select_one(
        ".base-search-card__title, "
        ".job-card-list__title, "
        ".job-card-container__primary-title, "
        "h3, "
        ".artdeco-entity-lockup__title"
    )
    company_el = root.select_one(
        ".base-search-card__subtitle, "
        ".job-card-container__company-name, "
        ".job-card-container__primary-description, "
        "h4"
    )
    loc_el = root.select_one(
        ".job-search-card__location, "
        ".job-card-container__metadata-item, "
        ".job-card-container__metadata-wrapper span"
    )

    title = title_el.get_text(strip=True) if title_el else anchor.get_text(strip=True)
    if not title:
        return None

    company = company_el.get_text(strip=True) if company_el else "Nie podano"
    location = loc_el.get_text(strip=True) if loc_el else None

    return ScrapedJob(
        job_board=JOB_BOARD,
        external_id=external_id,
        title=title,
        company=company,
        url=url,
        location=location,
    )


def _external_id_from_url(url: str) -> str | None:
    match = JOB_ID_RE.search(url)
    if match:
        return match.group(1)
    path = urlparse(url).path
    slug = path.split("/jobs/view/")[-1] if "/jobs/view/" in path else path
    return slug[:100] if slug else None


def _canonical_job_url(href: str) -> str:
    if href.startswith("http"):
        parsed = urlparse(href)
        return f"https://www.linkedin.com{parsed.path}"
    return urljoin(BASE_URL, href.split("?")[0])
