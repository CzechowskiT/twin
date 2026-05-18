"""Counters for public investor / traction surfaces (narrow scope, honest vs. bulk global scrapes)."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Job

# Values must match ``job_board`` strings persisted by scrapers (see per-scraper JOB_BOARD constants
# and ``global_boards.BoardSpec.job_board`` for indeed-pl).
MVP_TRACTION_JOB_BOARDS: frozenset[str] = frozenset(
    {
        "pracuj.pl",
        "rocketjobs.pl",
        "justjoin.it",
        "praca.pl",
        "indeed.pl",
        "linkedin.com",
    }
)


def count_validated_jobs_public_traction(db: Session) -> int:
    """Validated rows from Poland-first + LinkedIn sources only (excludes US/global bulk boards)."""
    return int(
        db.query(func.count())
        .select_from(Job)
        .filter(Job.is_validated.is_(True), Job.job_board.in_(MVP_TRACTION_JOB_BOARDS))
        .scalar()
        or 0
    )
