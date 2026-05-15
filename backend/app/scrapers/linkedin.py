"""LinkedIn public job search scraper (Playwright + BeautifulSoup).

MVP uses unauthenticated search only. LinkedIn may block headless browsers,
show login walls, or rate-limit requests — results are best-effort.

Do NOT commit credentials. For future login support use env vars only.
Respect LinkedIn Terms of Service; production use may require official APIs.
"""

import re
from urllib.parse import quote_plus, urljoin, urlparse

from bs4 import BeautifulSoup

from app.scrapers.base import ScrapedJob, validate_job

JOB_BOARD = "linkedin.com"
BASE_URL = "https://www.linkedin.com"
JOB_ID_RE = re.compile(r"-(\d{7,})(?:\?|$)")
CARD_SELECTORS = ".job-search-card, li.jobs-search-results__list-item"


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


def _build_search_url(keyword: str, location: str) -> str:
    kw = quote_plus(keyword.strip())
    loc = quote_plus(location.strip())
    return f"{BASE_URL}/jobs/search/?keywords={kw}&location={loc}&f_TPR=r604800"


def _fetch_search_html(keyword: str, location: str) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    url = _build_search_url(keyword, location)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            locale="en-US",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = context.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        _dismiss_cookie_banner(page)
        _scroll_results(page)
        html = page.content()
        browser.close()
    return html


def _dismiss_cookie_banner(page) -> None:
    for selector in (
        'button[action-type="ACCEPT"]',
        'button:has-text("Accept")',
        'button:has-text("Akceptuj")',
    ):
        try:
            btn = page.locator(selector).first
            if btn.is_visible(timeout=1_500):
                btn.click()
                page.wait_for_timeout(500)
                return
        except Exception:
            continue


def _scroll_results(page) -> None:
    page.wait_for_timeout(2_500)
    list_sel = ".jobs-search-results-list, .scaffold-layout__list"
    try:
        page.wait_for_selector(CARD_SELECTORS, timeout=15_000)
    except Exception:
        pass
    for _ in range(4):
        page.evaluate(
            """() => {
            const el = document.querySelector('.jobs-search-results-list')
                || document.querySelector('.scaffold-layout__list');
            if (el) el.scrollTop = el.scrollHeight;
            else window.scrollTo(0, document.body.scrollHeight);
        }"""
        )
        page.wait_for_timeout(1_000)


def _is_blocked_page(html: str) -> bool:
    lower = html.lower()
    if len(html) < 5_000:
        return True
    if "authwall" in lower or "join linkedin" in lower and "job-search-card" not in lower:
        return True
    return "checkpoint" in lower and "job-search-card" not in lower


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
        ".base-search-card__title, .job-card-list__title, h3, .artdeco-entity-lockup__title"
    )
    company_el = root.select_one(
        ".base-search-card__subtitle, .job-card-container__company-name, h4"
    )
    loc_el = root.select_one(".job-search-card__location, .job-card-container__metadata-item")

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
