"""Central registry of all job board scrapers."""

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass

from app.scrapers import compliance, justjoin, linkedin, praca, pracuj, rocketjobs
from app.scrapers.base import ScrapedJob
from app.scrapers.global_boards import GLOBAL_BOARD_SPECS, scrape_global_board
from app.scrapers.greenhouse import scrape_greenhouse_board

ScrapeFn = Callable[[], list[ScrapedJob]]


def _registry_limit() -> int:
    from app.config import get_settings

    return max(12, min(200, get_settings().scrape_jobs_per_board))


def _wrap_global(board_id: str) -> ScrapeFn:
    def _run() -> list[ScrapedJob]:
        return scrape_global_board(board_id, limit=_registry_limit())

    return _run


# Poland-focused boards (Playwright / HTML)
LOCAL_SCRAPERS: dict[str, ScrapeFn] = {
    "pracuj": lambda: pracuj.scrape_pracuj(limit=_registry_limit()),
    "pracuj-sales": lambda: pracuj.scrape_pracuj_sales(limit=_registry_limit()),
    "rocketjobs": lambda: rocketjobs.scrape_rocketjobs(limit=_registry_limit()),
    "rocketjobs-sales": lambda: rocketjobs.scrape_rocketjobs_sales(limit=_registry_limit()),
    "rocketjobs-roles": lambda: rocketjobs.scrape_rocketjobs_roles(limit=_registry_limit()),
    "justjoin": lambda: justjoin.scrape_justjoin(limit=_registry_limit()),
    "praca": lambda: praca.scrape_praca(limit=_registry_limit()),
    "linkedin": lambda: linkedin.scrape_linkedin(limit=min(25, _registry_limit())),
    "linkedin-sales": lambda: linkedin.scrape_linkedin_sales(limit=min(25, _registry_limit())),
}

# Greenhouse JSON boards — public ``/v1/boards/{token}/jobs`` (verified tokens only).
_GREENHOUSE_SPECS: tuple[tuple[str, str, str], ...] = (
    ("gh-stripe", "stripe", "Stripe"),
    ("gh-databricks", "databricks", "Databricks"),
    ("gh-airbnb", "airbnb", "Airbnb"),
    ("gh-duolingo", "duolingo", "Duolingo"),
    ("gh-cloudflare", "cloudflare", "Cloudflare"),
    ("gh-robinhood", "robinhood", "Robinhood"),
    ("gh-figma", "figma", "Figma"),
    ("gh-anthropic", "anthropic", "Anthropic"),
)


def _greenhouse_fn(token: str, label: str) -> ScrapeFn:
    def _run() -> list[ScrapedJob]:
        return scrape_greenhouse_board(token, label, limit=_registry_limit())

    return _run


GREENHOUSE_SCRAPERS: dict[str, ScrapeFn] = {
    bid: _greenhouse_fn(tok, lab) for bid, tok, lab in _GREENHOUSE_SPECS
}

_GREENHOUSE_LABEL_BY_ID: dict[str, str] = {bid: lab for bid, _, lab in _GREENHOUSE_SPECS}

GLOBAL_SCRAPERS: dict[str, ScrapeFn] = {
    board_id: _wrap_global(board_id) for board_id in GLOBAL_BOARD_SPECS
}

SCRAPE_REGISTRY: dict[str, ScrapeFn] = {**LOCAL_SCRAPERS, **GREENHOUSE_SCRAPERS, **GLOBAL_SCRAPERS}

DEFAULT_BOARD_TIMEOUT_SEC = 120

# Scrape-all order: PL sources first, LinkedIn, then every global board id (explicit — same ids as API / filters).
PRIORITY_BOARD_ORDER: tuple[str, ...] = (
    "pracuj",
    "pracuj-sales",
    "rocketjobs",
    "rocketjobs-sales",
    "rocketjobs-roles",
    "justjoin",
    "praca",
    "linkedin",
    "linkedin-sales",
    "indeed-pl",
    "indeed",
    "glassdoor",
    "monster",
    "ziprecruiter",
    "careerbuilder",
    "simplyhired",
    "jooble",
    "reed",
    "stepstone",
    "seek",
    "google-jobs",
    "snagajob",
)

BOARD_LABELS: dict[str, tuple[str, str]] = {
    "pracuj": ("pracuj.pl", "poland"),
    "pracuj-sales": ("pracuj.pl (wide roles)", "poland"),
    "rocketjobs": ("rocketjobs.pl", "poland"),
    "rocketjobs-sales": ("rocketjobs.pl (sales)", "poland"),
    "rocketjobs-roles": ("rocketjobs.pl (multi-role)", "poland"),
    "justjoin": ("justjoin.it", "poland"),
    "praca": ("praca.pl", "poland"),
    "linkedin": ("LinkedIn", "global"),
    "linkedin-sales": ("LinkedIn (sales)", "global"),
    "indeed": ("Indeed", "global"),
    "indeed-pl": ("Indeed (Poland)", "poland"),
    "glassdoor": ("Glassdoor", "global"),
    "monster": ("Monster", "americas"),
    "ziprecruiter": ("ZipRecruiter", "americas"),
    "careerbuilder": ("CareerBuilder", "americas"),
    "simplyhired": ("SimplyHired", "global"),
    "jooble": ("Jooble", "global"),
    "reed": ("Reed", "uk"),
    "stepstone": ("StepStone", "europe"),
    "seek": ("SEEK", "asia-pacific"),
    "google-jobs": ("Google for Jobs", "global"),
    "snagajob": ("Snagajob", "americas"),
}


def _board_label(board_id: str) -> tuple[str, str]:
    if board_id in BOARD_LABELS:
        return BOARD_LABELS[board_id]
    if board_id.startswith("gh-"):
        human = _GREENHOUSE_LABEL_BY_ID.get(board_id)
        if human:
            return (f"{human} (Greenhouse)", "global")
        tail = board_id.removeprefix("gh-").replace("-", " ").title()
        return (f"Greenhouse ({tail})", "global")
    return (board_id.replace("-", " ").title(), "global")


def scrape_allowlist_board_ids() -> frozenset[str] | None:
    """If set (non-empty env with at least one valid id), scrape-all and board list use this subset."""
    from app.config import get_settings

    raw = (get_settings().scrape_enabled_board_ids or "").strip()
    if not raw:
        return None
    valid = frozenset(bid for bid in (x.strip() for x in raw.split(",")) if bid in SCRAPE_REGISTRY)
    if not valid:
        return None
    return valid


def scrape_board_ids_ordered() -> list[str]:
    allow = scrape_allowlist_board_ids()
    all_ids = sorted(SCRAPE_REGISTRY.keys())
    priority = [b for b in PRIORITY_BOARD_ORDER if b in SCRAPE_REGISTRY]
    tail = [b for b in all_ids if b not in priority]
    ordered = priority + tail
    if allow is None:
        return ordered
    return [b for b in ordered if b in allow]


# Display order for dashboard / API (geographical regions, tight grouping).
REGION_ORDER: tuple[str, ...] = (
    "poland",
    "europe",
    "uk",
    "americas",
    "asia-pacific",
    "global",
)

_REGION_SLUG: dict[str, str] = {
    "Poland": "poland",
    "Europe": "europe",
    "UK": "uk",
    "Americas": "americas",
    "Asia-Pacific": "asia-pacific",
    "Global": "global",
}


def region_slug(display_region: str) -> str:
    return _REGION_SLUG.get(display_region, "global")


@dataclass(frozen=True)
class BoardScrapeOutcome:
    """Result of scraping one registered board."""

    board_id: str
    jobs: list[ScrapedJob]
    error: str | None = None


def list_boards() -> list[dict[str, str]]:
    """Metadata for API / dashboard, grouped by geographical region."""
    boards: list[dict[str, str]] = []
    for board_id in scrape_board_ids_ordered():
        if board_id in GLOBAL_BOARD_SPECS:
            spec = GLOBAL_BOARD_SPECS[board_id]
            boards.append(
                {
                    "id": board_id,
                    "label": spec.label,
                    "region": region_slug(spec.region),
                }
            )
        else:
            label, region = _board_label(board_id)
            boards.append({"id": board_id, "label": label, "region": region})

    def sort_key(item: dict[str, str]) -> tuple[int, str]:
        try:
            region_idx = REGION_ORDER.index(item["region"])
        except ValueError:
            region_idx = len(REGION_ORDER)
        return region_idx, item["label"].lower()

    boards.sort(key=sort_key)
    return boards


def run_scrape(board_id: str) -> list[ScrapedJob]:
    fn = SCRAPE_REGISTRY.get(board_id)
    if not fn:
        return []
    return fn()


def _scrape_with_timeout(fn: ScrapeFn, timeout_sec: int) -> tuple[list[ScrapedJob], str | None]:
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(fn)
        try:
            return future.result(timeout=timeout_sec), None
        except FuturesTimeoutError:
            return [], f"timed out after {timeout_sec}s"


def scrape_all_boards(
    per_board_timeout_sec: int = DEFAULT_BOARD_TIMEOUT_SEC,
) -> list[BoardScrapeOutcome]:
    """Run every registered board scraper sequentially (one board at a time)."""
    outcomes: list[BoardScrapeOutcome] = []
    ordered = scrape_board_ids_ordered()
    for index, board_id in enumerate(ordered):
        fn = SCRAPE_REGISTRY[board_id]
        error: str | None = None
        jobs: list[ScrapedJob] = []
        try:
            jobs, timeout_err = _scrape_with_timeout(fn, per_board_timeout_sec)
            error = timeout_err
        except linkedin.LinkedInScrapeError as exc:
            error = str(exc)
        except Exception as exc:
            error = str(exc)
        outcomes.append(BoardScrapeOutcome(board_id=board_id, jobs=jobs, error=error))
        if index < len(ordered) - 1:
            compliance.sleep_between_boards()
    return outcomes
