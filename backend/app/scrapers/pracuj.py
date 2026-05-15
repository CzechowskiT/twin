"""Pracuj.pl job scraper (Playwright + BeautifulSoup)."""

from bs4 import BeautifulSoup

from app.scrapers.base import ScrapedJob, validate_job

JOB_BOARD = "pracuj.pl"
BASE_URL = "https://www.pracuj.pl"


def scrape_pracuj(
    keyword: str = "python",
    location: str = "warszawa",
    limit: int = 100,
) -> list[ScrapedJob]:
    """
    Scrape listings from Pracuj.pl.

    Implementation note: HTML selectors must be verified against live pages
    before production runs. Week 1: wire Playwright pagination for full limit.
    """
    _ = keyword, location, limit
    return _scrape_with_playwright(keyword, location, min(limit, 10))


def _scrape_with_playwright(keyword: str, location: str, limit: int) -> list[ScrapedJob]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return []

    search_path = f"/praca/{keyword};kw/{location};wp"
    jobs: list[ScrapedJob] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{BASE_URL}{search_path}", wait_until="domcontentloaded", timeout=60000)
        html = page.content()
        browser.close()

    jobs = _parse_listing_html(html, limit)
    return [j for j in jobs if validate_job(j)]


def _parse_listing_html(html: str, limit: int) -> list[ScrapedJob]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select('[data-test="offer"], .offer, article')[:limit]
    results: list[ScrapedJob] = []

    for idx, card in enumerate(cards):
        title_el = card.select_one("h2, h3, [data-test='offer-title']")
        company_el = card.select_one("[data-test='offer-company-name'], .company")
        link_el = card.select_one("a[href]")
        if not title_el or not link_el:
            continue
        href = link_el.get("href", "")
        url = href if href.startswith("http") else f"{BASE_URL}{href}"
        external_id = href.rstrip("/").split("/")[-1] or str(idx)
        results.append(
            ScrapedJob(
                job_board=JOB_BOARD,
                external_id=external_id,
                title=title_el.get_text(strip=True),
                company=company_el.get_text(strip=True) if company_el else "Unknown",
                url=url,
            )
        )
    return results
