#!/usr/bin/env python3
"""Inspect job rows in the database (counts, recent listings).

Run from repository root:

  python3 backend/scripts/check_jobs.py
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, select  # noqa: E402

from app.database.connection import get_session  # noqa: E402
from app.database.models import Job  # noqa: E402


def main() -> int:
    with get_session() as db:
        total = db.execute(select(func.count()).select_from(Job)).scalar_one()
        print(f"Total jobs in database: {total}")

        recent = (
            db.execute(
                select(Job.title, Job.company, Job.job_board)
                .order_by(Job.id.desc())
                .limit(5),
            )
            .all()
        )
        print("\nLast 5 jobs (title, company, board):")
        for row in recent:
            print(f"  - {row.title!r} | {row.company!r} | {row.job_board}")

        by_board = db.execute(
            select(Job.job_board, func.count()).group_by(Job.job_board).order_by(Job.job_board),
        ).all()

    print("\nJobs by board:")
    for board, cnt in by_board:
        print(f"  {board}: {cnt}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
