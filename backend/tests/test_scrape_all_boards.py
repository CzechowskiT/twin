"""Tests for scrape-all-boards registry and Celery task."""

from unittest.mock import MagicMock, patch

from app.scrapers.base import ScrapedJob
from app.scrapers.registry import BoardScrapeOutcome, SCRAPE_REGISTRY, scrape_all_boards
from app.tasks.celery_app import celery_app
from app.tasks.scrape_tasks import scrape_all_boards_task


def _sample_job(board: str) -> ScrapedJob:
    return ScrapedJob(
        title="Sales Rep",
        company="Acme",
        location="Warsaw",
        url=f"https://example.com/{board}/1",
        job_board=board,
        external_id=f"{board}-1",
    )


def test_scrape_all_boards_runs_each_registry_entry_sequentially() -> None:
    calls: list[str] = []

    def make_fn(board_id: str):
        def _fn() -> list[ScrapedJob]:
            calls.append(board_id)
            return [_sample_job(board_id)]

        return _fn

    fake_registry = {bid: make_fn(bid) for bid in ("b", "a", "c")}
    with patch.dict(SCRAPE_REGISTRY, fake_registry, clear=True):
        outcomes = scrape_all_boards(per_board_timeout_sec=5)

    assert [o.board_id for o in outcomes] == ["a", "b", "c"]
    assert calls == ["a", "b", "c"]
    assert all(len(o.jobs) == 1 for o in outcomes)


def test_scrape_all_boards_continues_after_board_error() -> None:
    def ok() -> list[ScrapedJob]:
        return [_sample_job("ok")]

    def fail() -> list[ScrapedJob]:
        raise RuntimeError("board down")

    fake_registry = {"ok": ok, "bad": fail}
    with patch.dict(SCRAPE_REGISTRY, fake_registry, clear=True):
        outcomes = scrape_all_boards(per_board_timeout_sec=5)

    by_id = {o.board_id: o for o in outcomes}
    assert by_id["ok"].jobs
    assert by_id["bad"].error == "board down"
    assert not by_id["bad"].jobs


def test_scrape_all_boards_task_persists_and_returns_summary() -> None:
    outcomes = [
        BoardScrapeOutcome(board_id="a", jobs=[_sample_job("a.com")]),
        BoardScrapeOutcome(board_id="b", jobs=[], error="timed out"),
    ]
    mock_db = MagicMock()

    with (
        patch("app.tasks.scrape_tasks.scrape_all_boards", return_value=outcomes),
        patch("app.tasks.scrape_tasks.SessionLocal", return_value=mock_db),
        patch("app.tasks.scrape_tasks.upsert_jobs", side_effect=[2, 0]) as upsert,
    ):
        result = scrape_all_boards_task(per_board_timeout_sec=60)

    assert result["total_saved"] == 2
    assert result["boards"]["a"]["saved"] == 2
    assert result["boards"]["b"]["error"] == "timed out"
    assert result["errors"]["b"] == "timed out"
    upsert.assert_called_once()
    mock_db.close.assert_called_once()


def test_celery_beat_has_no_scheduled_scrapes() -> None:
    """Periodic scrapes disabled by default — use manual scrape from UI or API."""
    scrape_entries = [
        name
        for name, entry in celery_app.conf.beat_schedule.items()
        if "scrape" in entry.get("task", "").lower()
    ]
    assert scrape_entries == [], f"unexpected scrape beat entries: {scrape_entries}"
