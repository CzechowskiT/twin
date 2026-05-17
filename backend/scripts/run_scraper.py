#!/usr/bin/env python3
"""Manually scrape Pracuj.pl and persist jobs (management / verification).

Run from repository root:

  python3 backend/scripts/run_scraper.py

Requires: Playwright (`playwright install chromium`), DATABASE_URL / `.env` at repo root.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Before any `app.*` import: session module calls get_settings() at import time.
import os  # noqa: E402

# Listing-only Pracuj cards have no description; force min body off for this process.
os.environ["SCRAPE_MIN_JOB_BODY_CHARS"] = "0"

from sqlalchemy import func, update  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database.connection import get_session  # noqa: E402
from app.database.models import Job  # noqa: E402
from app.scrapers.base import ScrapedJob  # noqa: E402
from app.scrapers.pracuj import JOB_BOARD, scrape_pracuj  # noqa: E402
from app.services.job_storage import upsert_jobs  # noqa: E402

KEYWORDS = (
    "sales manager",
    "account manager",
    "business development",
    "chief sales officer",
    "python developer",
    "react developer",
)
PER_KEYWORD_LIMIT = 10
GLOBAL_CAP = 50
DEFAULT_LOCATION = "polska"


def _mark_scraped_validated(db: Session, external_ids: list[str]) -> None:
    """Set is_validated for all Pracuj rows we touched (new rows already True from upsert)."""
    if not external_ids:
        return
    stmt = (
        update(Job)
        .where(Job.job_board == JOB_BOARD, Job.external_id.in_(external_ids))
        .values(is_validated=True)
    )
    db.execute(stmt)
    db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape Pracuj.pl keywords and persist to the database.")
    parser.add_argument(
        "--location",
        default=DEFAULT_LOCATION,
        help="Pracuj location slug in the search URL (default: polska). Try warszawa if results are empty.",
    )
    args = parser.parse_args()
    location = args.location

    merged: list[ScrapedJob] = []
    seen_external: set[str] = set()

    for kw in KEYWORDS:
        if len(merged) >= GLOBAL_CAP:
            break
        need = min(PER_KEYWORD_LIMIT, GLOBAL_CAP - len(merged))
        batch = scrape_pracuj(keyword=kw, location=location, limit=need)
        print(f"Scraped {len(batch)} jobs from keyword {kw!r}")
        for job in batch:
            if job.external_id in seen_external:
                continue
            seen_external.add(job.external_id)
            merged.append(job)
            if len(merged) >= GLOBAL_CAP:
                break

    external_ids = [j.external_id for j in merged]

    with get_session() as db:
        saved = upsert_jobs(db, merged)
        _mark_scraped_validated(db, external_ids)
        total = db.query(func.count(Job.id)).scalar() or 0

    print(f"Persisted {saved} new job rows (skipped duplicates already in DB).")
    print(f"Total jobs in database: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
