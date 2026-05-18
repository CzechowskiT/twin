"""Scrapers for major global job boards (best-effort public search)."""

from dataclasses import dataclass
from typing import Callable
from urllib.parse import quote_plus

from app.scrapers.base import ScrapedJob, validate_job
from app.scrapers.playwright_utils import fetch_html, parse_job_links, parse_with_selectors

DEFAULT_KEYWORD = "sales"
DEFAULT_LOCATION = "Warsaw"


@dataclass(frozen=True)
class BoardSpec:
    board_id: str
    job_board: str
    label: str
    region: str
    build_url: Callable[[str, str], str]
    parse: Callable[[str, int], list[ScrapedJob]]


def _indeed_url(keyword: str, location: str) -> str:
    return (
        f"https://www.indeed.com/jobs?q={quote_plus(keyword)}&l={quote_plus(location)}"
    )


def _indeed_pl_url(keyword: str, location: str) -> str:
    """Indeed Poland — separate board id from US (.com) for deduping and locale."""
    return f"https://pl.indeed.com/praca?q={quote_plus(keyword)}&l={quote_plus(location)}"


def _parse_indeed_html(
    html: str,
    limit: int,
    *,
    job_board: str,
    base_url: str,
) -> list[ScrapedJob]:
    jobs = parse_with_selectors(
        html,
        job_board=job_board,
        base_url=base_url,
        card_selector=".job_seen_beacon, .jobsearch-SerpJobCard, div.slider_item",
        title_selector="h2.jobTitle span, a.jcs-JobTitle, h2 a",
        company_selector=".companyName, [data-testid='company-name']",
        location_selector=".companyLocation, [data-testid='text-location']",
        link_selector="h2 a, a.jcs-JobTitle",
        limit=limit,
    )
    if jobs:
        return jobs
    for marker in ("/rc/clk", "jk=", "/viewjob", "pagead/clk"):
        alt = parse_job_links(
            html, job_board=job_board, base_url=base_url, href_contains=marker, limit=limit
        )
        if alt:
            return alt
    return []


def _parse_indeed(html: str, limit: int) -> list[ScrapedJob]:
    return _parse_indeed_html(html, limit, job_board="indeed.com", base_url="https://www.indeed.com")


def _parse_indeed_pl(html: str, limit: int) -> list[ScrapedJob]:
    return _parse_indeed_html(html, limit, job_board="indeed.pl", base_url="https://pl.indeed.com")


def _glassdoor_url(keyword: str, location: str) -> str:
    return (
        "https://www.glassdoor.com/Job/jobs.htm?"
        f"sc.keyword={quote_plus(keyword)}&locT=C&locId=1142551&locKeyword={quote_plus(location)}"
    )


def _parse_glassdoor(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="glassdoor.com",
        base_url="https://www.glassdoor.com",
        card_selector="li.react-job-listing, article.JobCard",
        title_selector="a.JobCard_jobTitle, h3",
        company_selector=".EmployerProfile_employerName",
        link_selector="a.JobCard_jobTitle",
        limit=limit,
    ) or parse_job_links(
        html, job_board="glassdoor.com", base_url="https://www.glassdoor.com",
        href_contains="/job-listing/", limit=limit,
    )


def _monster_url(keyword: str, location: str) -> str:
    return (
        "https://www.monster.com/jobs/search?"
        f"q={quote_plus(keyword)}&where={quote_plus(location)}"
    )


def _parse_monster(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="monster.com",
        base_url="https://www.monster.com",
        card_selector="section.card-content, div.job-cardstyle",
        title_selector="h3, h2.jobTitle",
        company_selector=".company, .company-name",
        link_selector="a[href*='/job-openings/']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="monster.com", base_url="https://www.monster.com",
        href_contains="/job-openings/", limit=limit,
    )


def _ziprecruiter_url(keyword: str, location: str) -> str:
    return (
        "https://www.ziprecruiter.com/jobs-search?"
        f"search={quote_plus(keyword)}&location={quote_plus(location)}"
    )


def _parse_ziprecruiter(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="ziprecruiter.com",
        base_url="https://www.ziprecruiter.com",
        card_selector="article.job_result, div.job_content",
        title_selector="h2, p.job_title",
        company_selector=".hiring_company, .company_name",
        link_selector="a[href*='/jobs/']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="ziprecruiter.com", base_url="https://www.ziprecruiter.com",
        href_contains="/job/", limit=limit,
    )


def _careerbuilder_url(keyword: str, location: str) -> str:
    return (
        "https://www.careerbuilder.com/jobs?"
        f"keywords={quote_plus(keyword)}&location={quote_plus(location)}"
    )


def _parse_careerbuilder(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="careerbuilder.com",
        base_url="https://www.careerbuilder.com",
        card_selector="div.data-results-content, li.data-results-content",
        title_selector="h2, a.data-results-title",
        company_selector=".data-details span",
        link_selector="a.data-results-title",
        limit=limit,
    ) or parse_job_links(
        html, job_board="careerbuilder.com", base_url="https://www.careerbuilder.com",
        href_contains="/job/", limit=limit,
    )


def _simplyhired_url(keyword: str, location: str) -> str:
    return (
        "https://www.simplyhired.com/search?"
        f"q={quote_plus(keyword)}&l={quote_plus(location)}"
    )


def _parse_simplyhired(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="simplyhired.com",
        base_url="https://www.simplyhired.com",
        card_selector="article.SerpJob, li.css-1gvej5k",
        title_selector="h3, a[data-testid='job-title']",
        company_selector=".JobPosting-labelWithIcon, span[data-testid='company-name']",
        link_selector="a[data-testid='job-title']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="simplyhired.com", base_url="https://www.simplyhired.com",
        href_contains="/job/", limit=limit,
    )


def _jooble_url(keyword: str, location: str) -> str:
    return (
        "https://jooble.org/jobs/"
        f"{quote_plus(keyword)}?ukw={quote_plus(keyword)}&rgns={quote_plus(location)}"
    )


def _parse_jooble(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="jooble.org",
        base_url="https://jooble.org",
        card_selector="article, div._job_card",
        title_selector="h2, a[data-test-name='_title']",
        company_selector="span.zsIQO, .company-name",
        link_selector="a[href*='/desc/']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="jooble.org", base_url="https://jooble.org",
        href_contains="/desc/", limit=limit,
    )


def _reed_url(keyword: str, location: str) -> str:
    kw = quote_plus(keyword).replace("+", "-").lower()
    loc = quote_plus(location).replace("+", "-").lower()
    return f"https://www.reed.co.uk/jobs/{kw}-jobs-in-{loc}"


def _parse_reed(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="reed.co.uk",
        base_url="https://www.reed.co.uk",
        card_selector="article.job-result-card, div.job-result",
        title_selector="h3, a.job-card__title",
        company_selector=".job-card__company, .gtmJobListingCompany",
        link_selector="a.job-card__title",
        limit=limit,
    ) or parse_job_links(
        html, job_board="reed.co.uk", base_url="https://www.reed.co.uk",
        href_contains="/jobs/", limit=limit,
    )


def _stepstone_url(keyword: str, location: str) -> str:
    return (
        f"https://www.stepstone.de/jobs/{quote_plus(keyword)}/in-{quote_plus(location)}"
    )


def _parse_stepstone(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="stepstone.de",
        base_url="https://www.stepstone.de",
        card_selector="article[data-at='job-item'], article.res-1f8l1hb",
        title_selector="h2, a[data-at='job-item-title']",
        company_selector="span[data-at='job-item-company-name']",
        link_selector="a[data-at='job-item-title']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="stepstone.de", base_url="https://www.stepstone.de",
        href_contains="/stellenangebote", limit=limit,
    )


def _seek_url(keyword: str, location: str) -> str:
    return (
        "https://www.seek.com.au/"
        f"{quote_plus(keyword).replace('+', '-')}-jobs"
        f"/in-{quote_plus(location).replace('+', '-')}"
    )


def _parse_seek(html: str, limit: int) -> list[ScrapedJob]:
    return parse_with_selectors(
        html,
        job_board="seek.com.au",
        base_url="https://www.seek.com.au",
        card_selector="article[data-testid='job-card'], article[data-card-type='JobCard']",
        title_selector="h3, a[data-automation='jobTitle']",
        company_selector="span[data-automation='jobCompany'], a[data-automation='jobCompany']",
        link_selector="a[data-automation='jobTitle']",
        limit=limit,
    ) or parse_job_links(
        html, job_board="seek.com.au", base_url="https://www.seek.com.au",
        href_contains="/job/", limit=limit,
    )


def _google_jobs_url(keyword: str, location: str) -> str:
    """Google Jobs rich-result pack (HTML layout changes frequently — best-effort)."""
    q = quote_plus(f"{keyword} jobs {location}")
    return f"https://www.google.com/search?q={q}&ibp=htl;jobs"


def _parse_google_jobs(html: str, limit: int) -> list[ScrapedJob]:
    job_board = "google.com/jobs"
    base = "https://www.google.com"
    for marker in ("jobs/detail", "/jobs/collections/", "jobposting", "htidocid"):
        alt = parse_job_links(
            html, job_board=job_board, base_url=base, href_contains=marker, limit=limit
        )
        if alt:
            return alt
    return []


def _snagajob_url(keyword: str, location: str) -> str:
    return (
        "https://www.snagajob.com/search?"
        f"q={quote_plus(keyword)}&w={quote_plus(location)}"
    )


def _parse_snagajob(html: str, limit: int) -> list[ScrapedJob]:
    job_board = "snagajob.com"
    base = "https://www.snagajob.com"
    jobs = parse_with_selectors(
        html,
        job_board=job_board,
        base_url=base,
        card_selector="article, li.job-card, div[data-test='job-card']",
        title_selector="h2, h3, a[data-test='job-link']",
        company_selector="[data-test='company-name'], .company-name, span.company",
        link_selector="a[href*='/job/']",
        limit=limit,
    )
    if jobs:
        return jobs
    return parse_job_links(
        html, job_board=job_board, base_url=base, href_contains="/job/", limit=limit
    )


GLOBAL_BOARD_SPECS: dict[str, BoardSpec] = {
    "indeed": BoardSpec("indeed", "indeed.com", "Indeed", "Global", _indeed_url, _parse_indeed),
    "indeed-pl": BoardSpec("indeed-pl", "indeed.pl", "Indeed (Poland)", "Poland", _indeed_pl_url, _parse_indeed_pl),
    "glassdoor": BoardSpec("glassdoor", "glassdoor.com", "Glassdoor", "Global", _glassdoor_url, _parse_glassdoor),
    "monster": BoardSpec("monster", "monster.com", "Monster", "Americas", _monster_url, _parse_monster),
    "ziprecruiter": BoardSpec("ziprecruiter", "ziprecruiter.com", "ZipRecruiter", "Americas", _ziprecruiter_url, _parse_ziprecruiter),
    "careerbuilder": BoardSpec("careerbuilder", "careerbuilder.com", "CareerBuilder", "Americas", _careerbuilder_url, _parse_careerbuilder),
    "simplyhired": BoardSpec("simplyhired", "simplyhired.com", "SimplyHired", "Global", _simplyhired_url, _parse_simplyhired),
    "jooble": BoardSpec("jooble", "jooble.org", "Jooble", "Global", _jooble_url, _parse_jooble),
    "reed": BoardSpec("reed", "reed.co.uk", "Reed", "UK", _reed_url, _parse_reed),
    "stepstone": BoardSpec("stepstone", "stepstone.de", "StepStone", "Europe", _stepstone_url, _parse_stepstone),
    "seek": BoardSpec("seek", "seek.com.au", "SEEK", "Asia-Pacific", _seek_url, _parse_seek),
    "google-jobs": BoardSpec(
        "google-jobs",
        "google.com/jobs",
        "Google for Jobs",
        "Global",
        _google_jobs_url,
        _parse_google_jobs,
    ),
    "snagajob": BoardSpec(
        "snagajob",
        "snagajob.com",
        "Snagajob",
        "Americas",
        _snagajob_url,
        _parse_snagajob,
    ),
}


def scrape_global_board(
    board_id: str,
    keyword: str = DEFAULT_KEYWORD,
    location: str = DEFAULT_LOCATION,
    limit: int = 20,
) -> list[ScrapedJob]:
    """Fetch and parse one global job board by registry id."""
    spec = GLOBAL_BOARD_SPECS.get(board_id)
    if not spec:
        return []
    url = spec.build_url(keyword, location)
    locale = "pl-PL" if board_id == "indeed-pl" else "en-US"
    html = fetch_html(url, locale=locale)
    jobs = spec.parse(html, limit)
    return [j for j in jobs if validate_job(j)]
