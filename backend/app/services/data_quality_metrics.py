"""Aggregate job listing quality metrics for ops dashboards."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Job


def build_data_quality_report(db: Session) -> dict:
    """Return counts and percentages for scraped job data health."""
    total = db.query(func.count(Job.id)).scalar() or 0
    if total == 0:
        return {
            "total_jobs": 0,
            "validated_jobs": 0,
            "validated_pct": 0.0,
            "missing_location": 0,
            "missing_location_pct": 0.0,
            "missing_salary": 0,
            "missing_salary_pct": 0.0,
            "stale_jobs_30d": 0,
            "stale_jobs_30d_pct": 0.0,
            "by_board": {},
        }
    validated = db.query(func.count(Job.id)).filter(Job.is_validated.is_(True)).scalar() or 0
    missing_loc = db.query(func.count(Job.id)).filter(Job.location.is_(None)).scalar() or 0
    missing_salary = (
        db.query(func.count(Job.id))
        .filter(Job.salary_min.is_(None), Job.salary_max.is_(None))
        .scalar()
        or 0
    )
    cutoff = datetime.utcnow() - timedelta(days=30)
    stale = db.query(func.count(Job.id)).filter(Job.scraped_at < cutoff).scalar() or 0
    board_rows = (
        db.query(Job.job_board, func.count(Job.id))
        .group_by(Job.job_board)
        .order_by(func.count(Job.id).desc())
        .all()
    )
    pct = lambda n: round(100.0 * n / total, 1)
    return {
        "total_jobs": total,
        "validated_jobs": validated,
        "validated_pct": pct(validated),
        "missing_location": missing_loc,
        "missing_location_pct": pct(missing_loc),
        "missing_salary": missing_salary,
        "missing_salary_pct": pct(missing_salary),
        "stale_jobs_30d": stale,
        "stale_jobs_30d_pct": pct(stale),
        "by_board": {board: count for board, count in board_rows},
    }
