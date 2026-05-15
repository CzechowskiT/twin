"""RocketJobs.pl job scraper."""

from bs4 import BeautifulSoup

from app.scrapers.base import ScrapedJob, validate_job

JOB_BOARD = "rocketjobs.pl"
BASE_URL = "https://rocketjobs.pl"


def scrape_rocketjobs(keyword: str = "python", limit: int = 100) -> list[ScrapedJob]:
    """Scrape listings from RocketJobs.pl."""
    return _scrape_with_playwright(keyword, min(limit, 10))


def _scrape_with_playwright(keyword: str, limit: int) -> list[ScrapedJob]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return []

    jobs: list[ScrapedJob] = []
    search_url = f"{BASE_URL}/jobs?keyword={keyword}"

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
        html = page.content()
        browser.close()

    jobs = _parse_listing_html(html, limit)
    return [j for j in jobs if validate_job(j)]


def _parse_listing_html(html: str, limit: int) -> list[ScrapedJob]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("article, .job-card, [data-job-id]")[:limit]
    results: list[ScrapedJob] = []

    for idx, card in enumerate(cards):
        title_el = card.select_one("h2, h3, a")
        link_el = card.select_one("a[href]")
        if not title_el or not link_el:
            continue
        href = link_el.get("href", "")
        url = href if href.startswith("http") else f"{BASE_URL}{href}"
        external_id = card.get("data-job-id") or href.rstrip("/").split("/")[-1] or str(idx)
        results.append(
            ScrapedJob(
                job_board=JOB_BOARD,
                external_id=str(external_id),
                title=title_el.get_text(strip=True),
                company="Unknown",
                url=url,
            )
        )
    return results
