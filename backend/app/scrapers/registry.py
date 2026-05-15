"""Central registry of all job board scrapers."""

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass

from app.scrapers import linkedin, pracuj, rocketjobs
from app.scrapers.base import ScrapedJob
from app.scrapers.global_boards import GLOBAL_BOARD_SPECS, scrape_global_board

ScrapeFn = Callable[[], list[ScrapedJob]]


def _wrap_global(board_id: str) -> ScrapeFn:
    def _run() -> list[ScrapedJob]:
        return scrape_global_board(board_id, limit=20)

    return _run


# Poland-focused boards (existing)
LOCAL_SCRAPERS: dict[str, ScrapeFn] = {
    "pracuj": lambda: pracuj.scrape_pracuj(limit=20),
    "pracuj-sales": lambda: pracuj.scrape_pracuj_sales(limit=25),
    "rocketjobs": lambda: rocketjobs.scrape_rocketjobs(limit=20),
    "rocketjobs-sales": lambda: rocketjobs.scrape_rocketjobs_sales(limit=20),
    "linkedin": lambda: linkedin.scrape_linkedin(limit=20),
    "linkedin-sales": lambda: linkedin.scrape_linkedin_sales(limit=20),
}

GLOBAL_SCRAPERS: dict[str, ScrapeFn] = {
    board_id: _wrap_global(board_id) for board_id in GLOBAL_BOARD_SPECS
}

SCRAPE_REGISTRY: dict[str, ScrapeFn] = {**LOCAL_SCRAPERS, **GLOBAL_SCRAPERS}

DEFAULT_BOARD_TIMEOUT_SEC = 120

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
    boards: list[dict[str, str]] = [
        {"id": "pracuj-sales", "label": "pracuj.pl", "region": "poland"},
        {"id": "rocketjobs-sales", "label": "rocketjobs.pl", "region": "poland"},
        {"id": "linkedin", "label": "LinkedIn", "region": "global"},
    ]
    for spec in GLOBAL_BOARD_SPECS.values():
        boards.append(
            {
                "id": spec.board_id,
                "label": spec.label,
                "region": region_slug(spec.region),
            }
        )

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
    for board_id in sorted(SCRAPE_REGISTRY):
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
    return outcomes
