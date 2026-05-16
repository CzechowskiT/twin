"""Pracuj.pl job scraper (Playwright + BeautifulSoup)."""

import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.scrapers.base import ScrapedJob, validate_job

JOB_BOARD = "pracuj.pl"
BASE_URL = "https://www.pracuj.pl"
OFFER_SELECTORS = (
    '[data-test="default-offer"], '
    '[data-test="positioned-offer"], '
    '[data-test="promoted-offer"]'
)
EXTERNAL_ID_RE = re.compile(r",oferta,(\d+)")
SALES_SEARCH_TERMS = (
    "sprzedaz",
    "handlowiec",
    "account-manager",
    "business-development",
    "crm",
    "python",
    "java",
    "javascript",
    "devops",
    "data-analyst",
    "product-manager",
    "project-manager",
    "marketing",
    "hr",
    "ksiegowosc",
    "frontend",
    "backend",
    "customer-success",
    "designer",
    "finanse",
    "operations",
    "consulting",
    "engineering-manager",
)


def scrape_pracuj(
    keyword: str = "python",
    location: str = "warszawa",
    limit: int = 20,
) -> list[ScrapedJob]:
    """Scrape job listings from Pracuj.pl search results."""
    html = _fetch_search_html(keyword, location)
    jobs = _parse_listing_html(html, limit)
    return [j for j in jobs if validate_job(j)]


def scrape_pracuj_sales(location: str = "warszawa", limit: int = 25) -> list[ScrapedJob]:
    """Scrape sales / commercial roles from multiple Pracuj.pl searches."""
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for keyword in SALES_SEARCH_TERMS:
        if len(results) >= limit:
            break
        html = _fetch_search_html(keyword, location)
        for job in _parse_listing_html(html, limit):
            if job.external_id in seen:
                continue
            if not validate_job(job):
                continue
            seen.add(job.external_id)
            results.append(job)
            if len(results) >= limit:
                break

    return results


def _build_search_url(keyword: str, location: str) -> str:
    slug_kw = keyword.strip().lower().replace(" ", "-")
    slug_loc = location.strip().lower().replace(" ", "-")
    return f"{BASE_URL}/praca/{slug_kw};kw/{slug_loc};wp"


def _fetch_search_html(keyword: str, location: str) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    url = _build_search_url(keyword, location)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(
            locale="pl-PL",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        _dismiss_cookie_banner(page)
        page.wait_for_timeout(2_500)
        html = page.content()
        browser.close()
    return html


def _dismiss_cookie_banner(page) -> None:
    """Accept cookies so listing markup renders consistently."""
    selectors = (
        "#onetrust-accept-btn-handler",
        'button:has-text("Akceptuję")',
        'button:has-text("Akceptuj")',
    )
    for selector in selectors:
        try:
            button = page.locator(selector).first
            if button.is_visible(timeout=1_500):
                button.click()
                page.wait_for_timeout(500)
                return
        except Exception:
            continue


def _parse_listing_html(html: str, limit: int) -> list[ScrapedJob]:
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(OFFER_SELECTORS)
    results: list[ScrapedJob] = []
    seen_ids: set[str] = set()

    for card in cards:
        if len(results) >= limit:
            break
        job = _parse_offer_card(card)
        if not job or job.external_id in seen_ids:
            continue
        seen_ids.add(job.external_id)
        results.append(job)

    return results


def _parse_offer_card(card) -> ScrapedJob | None:
    title_el = card.select_one('[data-test="offer-title"]')
    link_el = card.select_one('[data-test="link-offer-title"]') or card.select_one(
        'a[href*=",oferta,"]'
    )
    company_el = card.select_one('[data-test="text-company-name"]')
    region_el = card.select_one('[data-test="text-region"]')
    salary_el = card.select_one('[data-test="offer-salary"]')

    if not title_el or not link_el:
        return None

    href = link_el.get("href", "").strip()
    if not href:
        return None

    url = href if href.startswith("http") else urljoin(BASE_URL, href)
    external_id = _external_id_from_url(url)
    if not external_id:
        return None

    company = company_el.get_text(strip=True) if company_el else ""
    if not company:
        company = "Nie podano"

    return ScrapedJob(
        job_board=JOB_BOARD,
        external_id=external_id,
        title=title_el.get_text(strip=True),
        company=company,
        url=_canonical_offer_url(url),
        location=region_el.get_text(strip=True) if region_el else None,
        requirements=salary_el.get_text(strip=True) if salary_el else None,
    )


def _external_id_from_url(url: str) -> str | None:
    match = EXTERNAL_ID_RE.search(url)
    if match:
        return match.group(1)
    path = urlparse(url).path
    if path:
        return path.rstrip("/").split("/")[-1][:100]
    return None


def _canonical_offer_url(url: str) -> str:
    """Drop tracking query params; keep stable job URL."""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
