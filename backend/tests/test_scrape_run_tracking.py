"""Redis-backed scrape run telemetry."""

from app.services.scrape_run_tracking import (
    finish_run,
    get_latest_run,
    last_scrape_run_at,
    record_board,
    start_run,
)


def test_scrape_run_lifecycle() -> None:
    start_run(run_kind="pl_core_daily", board_ids=["pracuj", "justjoin"])
    record_board(
        run_kind="pl_core_daily",
        board_id="pracuj",
        metrics={"scraped": 10, "saved": 2, "new": 2, "updated": 8},
    )
    finish_run(run_kind="pl_core_daily", active_validated_after=120)
    latest = get_latest_run()
    assert latest is not None
    assert latest["run_kind"] == "pl_core_daily"
    assert latest["status"] == "ok"
    assert latest["sources"]["pracuj"]["new"] == 2
    assert latest["active_validated_after"] == 120
    assert last_scrape_run_at() is not None
