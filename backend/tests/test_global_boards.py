"""Tests for global job board parsers and registry."""

from app.scrapers.global_boards import (
    GLOBAL_BOARD_SPECS,
    _parse_indeed,
    _parse_reed,
)
from app.scrapers.registry import list_boards, run_scrape

INDEED_SNIPPET = """
<html><body>
<div class="job_seen_beacon">
  <h2 class="jobTitle"><a href="/rc/clk?jk=abc123"><span>Sales Manager</span></a></h2>
  <span class="companyName">Acme Corp</span>
  <div class="companyLocation">Warsaw</div>
</div>
</body></html>
"""

REED_SNIPPET = """
<html><body>
<article class="job-result-card">
  <a class="job-card__title" href="/jobs/sales-manager/123">Sales Manager</a>
  <span class="job-card__company">Acme Ltd</span>
</article>
</body></html>
"""


def test_global_board_specs_count() -> None:
    assert len(GLOBAL_BOARD_SPECS) == 10
    assert set(GLOBAL_BOARD_SPECS) == {
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
    }


def test_parse_indeed_fixture() -> None:
    jobs = _parse_indeed(INDEED_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].title == "Sales Manager"
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].job_board == "indeed.com"


def test_parse_reed_fixture() -> None:
    jobs = _parse_reed(REED_SNIPPET, limit=5)
    assert len(jobs) == 1
    assert jobs[0].title == "Sales Manager"
    assert jobs[0].company == "Acme Ltd"
    assert jobs[0].job_board == "reed.co.uk"


def test_list_boards_includes_all_global_specs() -> None:
    boards = list_boards()
    global_ids = {b["id"] for b in boards if b["region"] != "poland"}
    assert set(GLOBAL_BOARD_SPECS).issubset(global_ids)
    assert {b["region"] for b in boards if b["id"] in ("pracuj-sales", "rocketjobs-sales")} == {"poland"}


def test_list_boards_sorted_by_region() -> None:
    from app.scrapers.registry import REGION_ORDER

    boards = list_boards()
    indices = [REGION_ORDER.index(b["region"]) for b in boards if b["region"] in REGION_ORDER]
    assert indices == sorted(indices)


def test_run_scrape_unknown_board_returns_empty() -> None:
    assert run_scrape("not-a-board") == []
