"""Counters for public investor / traction surfaces (narrow scope, honest vs. bulk global scrapes)."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Job

# Values must match ``job_board`` strings persisted by scrapers (see per-scraper JOB_BOARD constants
# and ``global_boards.BoardSpec.job_board`` for indeed-pl). Order is stable for API/UI breakdowns.
MVP_TRACTION_JOB_BOARDS_ORDER: tuple[str, ...] = (
    "pracuj.pl",
    "rocketjobs.pl",
    "justjoin.it",
    "praca.pl",
    "indeed.pl",
    "linkedin.com",
)
MVP_TRACTION_JOB_BOARDS: frozenset[str] = frozenset(MVP_TRACTION_JOB_BOARDS_ORDER)


def validated_jobs_counts_by_traction_board(db: Session) -> list[tuple[str, int]]:
    """Per-board validated counts within traction scope (zeros filled for boards with no rows)."""
    rows = (
        db.query(Job.job_board, func.count())
        .filter(Job.is_validated.is_(True), Job.job_board.in_(MVP_TRACTION_JOB_BOARDS))
        .group_by(Job.job_board)
        .all()
    )
    by_board = {str(b): int(c) for b, c in rows}
    return [(board, by_board.get(board, 0)) for board in MVP_TRACTION_JOB_BOARDS_ORDER]


def count_validated_jobs_public_traction(db: Session) -> int:
    """Validated rows from Poland-first + LinkedIn sources only (excludes US/global bulk boards)."""
    return sum(c for _, c in validated_jobs_counts_by_traction_board(db))
