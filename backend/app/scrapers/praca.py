"""Praca.pl — multi-keyword search (Playwright HTML + resilient selectors)."""

from urllib.parse import quote_plus

from app.scrapers.base import ScrapedJob, validate_job
from app.scrapers.playwright_utils import fetch_html, parse_job_links, parse_with_selectors

JOB_BOARD = "praca.pl"
BASE_URL = "https://www.praca.pl"

# Broad role mix for MVP coverage (Polish + international titles).
PRACA_KEYWORDS = (
    "python",
    "java",
    "javascript",
    "devops",
    "product owner",
    "project manager",
    "sprzedaz",
    "marketing",
    "hr",
    "ksiegowosc",
    "data analyst",
    "frontend",
    "backend",
    "customer success",
    "designer",
)


def _parse_listing(html: str, limit: int) -> list[ScrapedJob]:
    if not html:
        return []
    jobs = parse_with_selectors(
        html,
        job_board=JOB_BOARD,
        base_url=BASE_URL,
        card_selector="article, li[class*='offer'], div[class*='Offer'], div[data-offer-id]",
        title_selector="a[href*='/oferta/']",
        company_selector="a[href*='/pracodawca/'], .employer, [class*='company'], span[class*='Company']",
        link_selector="a[href*='/oferta/']",
        location_selector="[class*='location'], [class*='Locality'], .locality",
        limit=limit,
    )
    if jobs:
        return jobs
    return parse_job_links(
        html,
        job_board=JOB_BOARD,
        base_url=BASE_URL,
        href_contains="/oferta/",
        limit=limit,
    )


def scrape_praca(limit: int = 50) -> list[ScrapedJob]:
    results: list[ScrapedJob] = []
    seen: set[str] = set()
    for kw in PRACA_KEYWORDS:
        if len(results) >= limit:
            break
        url = f"{BASE_URL}/szukaj?keywords={quote_plus(kw)}"
        html = fetch_html(url, locale="pl-PL")
        for job in _parse_listing(html, limit - len(results)):
            if job.external_id in seen:
                continue
            if not validate_job(job):
                continue
            seen.add(job.external_id)
            results.append(job)
    return results
