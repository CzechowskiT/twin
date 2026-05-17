"""Shared Playwright helpers for job board scrapers."""

from collections.abc import Callable
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from app.scrapers import compliance

COOKIE_SELECTORS = (
    "#onetrust-accept-btn-handler",
    'button[action-type="ACCEPT"]',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
    'button:has-text("Akceptuję")',
    'button:has-text("Akceptuj")',
    'button:has-text("Accept")',
    'button:has-text("I agree")',
    'button:has-text("Agree")',
    '[data-testid="accept-btn"]',
)


def fetch_html(
    url: str,
    *,
    locale: str = "en-US",
    wait_until: str = "domcontentloaded",
    scroll_fn: Callable | None = None,
    timeout_ms: int = 90_000,
) -> str:
    """Load URL in headless Chromium and return page HTML."""
    if not compliance.assert_url_may_be_fetched(url):
        return ""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(locale=locale, user_agent=compliance.get_scrape_user_agent())
        page = context.new_page()
        page.goto(url, wait_until=wait_until, timeout=timeout_ms)
        dismiss_cookies(page)
        page.wait_for_timeout(2_000)
        if scroll_fn:
            scroll_fn(page)
        else:
            default_scroll(page)
        html = page.content()
        browser.close()
    compliance.post_fetch_delay()
    return html


def dismiss_cookies(page) -> None:
    for selector in COOKIE_SELECTORS:
        try:
            btn = page.locator(selector).first
            if btn.is_visible(timeout=1_200):
                btn.click()
                page.wait_for_timeout(400)
                return
        except Exception:
            continue


def default_scroll(page) -> None:
    for _ in range(4):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(900)


def parse_with_selectors(
    html: str,
    *,
    job_board: str,
    base_url: str,
    card_selector: str,
    title_selector: str,
    company_selector: str | None = None,
    link_selector: str | None = None,
    location_selector: str | None = None,
    limit: int = 20,
) -> list:
    """Parse listing HTML using board-specific CSS selectors."""
    from app.scrapers.base import ScrapedJob

    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(card_selector)
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for card in cards:
        if len(results) >= limit:
            break
        title_el = card.select_one(title_selector)
        link_el = card.select_one(link_selector or "a[href]")
        if not title_el or not link_el:
            continue
        href = link_el.get("href", "").strip()
        if not href or href.startswith("#"):
            continue
        url = href if href.startswith("http") else urljoin(base_url, href)
        external_id = _id_from_url(url)
        if external_id in seen:
            continue
        seen.add(external_id)
        company_el = card.select_one(company_selector) if company_selector else None
        loc_el = card.select_one(location_selector) if location_selector else None
        company = company_el.get_text(strip=True) if company_el else "Unknown"
        results.append(
            ScrapedJob(
                job_board=job_board,
                external_id=external_id,
                title=title_el.get_text(strip=True),
                company=company or "Unknown",
                url=url.split("?")[0] if "?" in url else url,
                location=loc_el.get_text(strip=True) if loc_el else None,
            )
        )
    return results


def parse_job_links(
    html: str,
    *,
    job_board: str,
    base_url: str,
    href_contains: str,
    limit: int = 20,
) -> list:
    """Fallback: collect job links whose href contains a marker."""
    from app.scrapers.base import ScrapedJob

    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        if len(results) >= limit:
            break
        href = anchor["href"]
        if href_contains not in href:
            continue
        url = href if href.startswith("http") else urljoin(base_url, href)
        external_id = _id_from_url(url)
        if external_id in seen:
            continue
        title = anchor.get_text(strip=True)
        if len(title) < 4:
            continue
        seen.add(external_id)
        results.append(
            ScrapedJob(
                job_board=job_board,
                external_id=external_id,
                title=title[:300],
                company="Unknown",
                url=url.split("?")[0],
            )
        )
    return results


def _id_from_url(url: str) -> str:
    path = url.rstrip("/").split("/")[-1]
    return (path or url)[:100]
