#!/usr/bin/env python3
"""Run scrape-all (or subset) with per-board logging for market coverage ops.

Usage:
  python scripts/scrape_market_coverage.py --dry-run
  python scripts/scrape_market_coverage.py --boards pracuj,justjoin,gh-stripe
  python scripts/scrape_market_coverage.py --persist
"""

from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal
from app.scrapers import compliance
from app.scrapers.registry import SCRAPE_REGISTRY, scrape_board_ids_ordered
from app.services.job_storage import upsert_jobs
from app.services.market_coverage import build_market_coverage_report


def main() -> int:
    parser = argparse.ArgumentParser(description="Market coverage scrape runner")
    parser.add_argument(
        "--boards",
        default="",
        help="Comma-separated board ids (default: full registry order)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scrape only; do not write to the database",
    )
    parser.add_argument(
        "--persist",
        action="store_true",
        help="Upsert scraped rows (default when neither dry-run nor persist: dry-run)",
    )
    parser.add_argument("--timeout", type=int, default=120, help="Per-board timeout seconds")
    args = parser.parse_args()
    dry_run = args.dry_run or not args.persist

    if args.boards.strip():
        os.environ["SCRAPE_ENABLED_BOARD_IDS"] = args.boards.strip()

    board_ids = scrape_board_ids_ordered()
    print(json.dumps({"mode": "dry-run" if dry_run else "persist", "boards": board_ids}, indent=2))

    results: list[dict] = []
    for index, board_id in enumerate(board_ids):
        fn = SCRAPE_REGISTRY.get(board_id)
        if not fn:
            continue
        try:
            jobs = fn()
            err = None
        except Exception as exc:
            jobs = []
            err = str(exc)
        saved = 0
        if not dry_run and jobs:
            db = SessionLocal()
            try:
                saved = upsert_jobs(db, jobs)
            finally:
                db.close()
        row = {
            "board_id": board_id,
            "scraped": len(jobs),
            "saved": saved,
            "error": err,
        }
        results.append(row)
        print(json.dumps(row), flush=True)
        if index < len(board_ids) - 1:
            compliance.sleep_between_boards()

    db = SessionLocal()
    try:
        report = build_market_coverage_report(db)
    finally:
        db.close()
    print(json.dumps({"coverage_after": report, "boards": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
