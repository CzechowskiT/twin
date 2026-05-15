"""RocketJobs.pl job scraper (Playwright + BeautifulSoup)."""

import re
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from app.scrapers.base import ScrapedJob, validate_job

JOB_BOARD = "rocketjobs.pl"
BASE_URL = "https://rocketjobs.pl"
OFFER_HREF_RE = re.compile(r"^/oferta-pracy/[^?#]+$")
# RocketJobs returns few results per query; combine related terms for tech roles.
KEYWORD_EXPANSIONS: dict[str, list[str]] = {
    "python": ["python", "it"],
    "developer": ["developer", "it"],
    "sales": ["sprzedaz", "sales", "crm", "account+manager", "handlowiec"],
}


def scrape_rocketjobs_sales(limit: int = 20) -> list[ScrapedJob]:
    """Scrape sales / commercial listings from RocketJobs.pl."""
    return scrape_rocketjobs(keyword="sales", limit=limit)


def scrape_rocketjobs(keyword: str = "python", limit: int = 20) -> list[ScrapedJob]:
    """Scrape listings from RocketJobs.pl search results."""
    terms = KEYWORD_EXPANSIONS.get(keyword.strip().lower(), [keyword])
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for term in terms:
        if len(results) >= limit:
            break
        html = _fetch_search_html(term)
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


def _build_search_url(keyword: str) -> str:
    slug = keyword.strip().lower().replace(" ", "+")
    return f"{BASE_URL}/oferty-pracy?keyword={slug}"


def _fetch_search_html(keyword: str) -> str:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return ""

    url = _build_search_url(keyword)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(
            locale="pl-PL",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page.goto(url, wait_until="networkidle", timeout=90_000)
        _dismiss_cookie_banner(page)
        _scroll_to_load_offers(page)
        html = page.content()
        browser.close()
    return html


def _dismiss_cookie_banner(page) -> None:
    selectors = (
        'button:has-text("Akceptuję")',
        'button:has-text("Akceptuj")',
        "#onetrust-accept-btn-handler",
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


def _scroll_to_load_offers(page) -> None:
    """RocketJobs lazy-loads cards on scroll."""
    page.wait_for_timeout(2_000)
    for _ in range(5):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1_200)


def _parse_listing_html(html: str, limit: int) -> list[ScrapedJob]:
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    results: list[ScrapedJob] = []
    seen: set[str] = set()

    for anchor in soup.find_all("a", href=OFFER_HREF_RE):
        if len(results) >= limit:
            break
        job = _parse_offer_anchor(anchor)
        if not job or job.external_id in seen:
            continue
        seen.add(job.external_id)
        results.append(job)

    return results


def _parse_offer_anchor(anchor) -> ScrapedJob | None:
    href = anchor.get("href", "").strip()
    if not href:
        return None

    title_el = anchor.find(["h2", "h3", "h4"])
    if not title_el:
        title_el = anchor.find_parent(["h2", "h3", "h4"])

    title = title_el.get_text(strip=True) if title_el else _title_from_slug(href)
    if not title:
        return None

    company, location, salary = _parse_anchor_meta(anchor, title)
    url = urljoin(BASE_URL, href)
    external_id = _external_id_from_href(href)

    return ScrapedJob(
        job_board=JOB_BOARD,
        external_id=external_id,
        title=title,
        company=company or "Nie podano",
        url=url,
        location=location,
        requirements=salary,
    )


def _parse_anchor_meta(anchor, title: str) -> tuple[str | None, str | None, str | None]:
    raw = anchor.get_text("|", strip=True)
    parts = [p.strip() for p in raw.split("|") if p.strip()] if "|" in raw else []
    company = parts[0] if parts else None
    location = parts[1] if len(parts) > 1 else None

    salary = None
    for part in parts:
        if "PLN" in part or "Wynagrodzenie" in part:
            salary = part
            break

    if not company or company == title or title in company:
        company = _company_from_slug(anchor.get("href", ""))
    return company, location, salary


def _external_id_from_href(href: str) -> str:
    slug = href.removeprefix("/oferta-pracy/").strip("/")
    return slug[:100] if slug else href


def _title_from_slug(href: str) -> str:
    slug = _external_id_from_href(href)
    # Drop trailing category segment (e.g. bi-data, finanse-analiza)
    words = slug.replace("--", " ").split("-")
    return " ".join(w.capitalize() for w in words[:8])


def _company_from_slug(href: str) -> str:
    slug = _external_id_from_href(href)
    # Slugs often start with employer name before role keywords
    stop_words = {"sp", "z", "oo", "sa", "spolka", "ograniczona", "odpowiedzialnoscia"}
    words: list[str] = []
    for word in slug.split("-"):
        if word in stop_words or word.isdigit():
            words.append(word.upper() if len(word) <= 2 else word.capitalize())
            continue
        if word in ("data", "engineer", "developer", "analyst", "senior", "junior", "warszawa"):
            break
        words.append(word.capitalize())
    return " ".join(words)[:120] if words else "Nie podano"


def _canonical_offer_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
