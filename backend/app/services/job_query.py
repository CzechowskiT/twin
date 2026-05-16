"""Filtered job listing for dashboard."""

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session

from app.database.models import Job

SORT_NEWEST = "newest"
SORT_SALARY = "salary"
SORT_COMPANY = "company"


def apply_job_filters(
    query: Query,
    *,
    q: str | None = None,
    location: str | None = None,
    job_board: str | None = None,
    min_salary: int | None = None,
    title_terms: str | None = None,
    sort: str = SORT_NEWEST,
) -> Query:
    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Job.title.ilike(term),
                Job.company.ilike(term),
                Job.location.ilike(term),
                Job.description.ilike(term),
                Job.requirements.ilike(term),
            )
        )
    if location:
        query = query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if job_board:
        query = query.filter(Job.job_board.ilike(f"%{job_board.strip()}%"))
    if min_salary is not None and min_salary > 0:
        query = query.filter(
            or_(
                Job.salary_max >= min_salary,
                Job.salary_min >= min_salary,
            )
        )
    if title_terms and title_terms.strip():
        parts = [p.strip() for p in title_terms.replace("|", ",").split(",") if p.strip()]
        if parts:
            query = query.filter(or_(*(Job.title.ilike(f"%{p}%") for p in parts)))

    if sort == SORT_SALARY:
        return query.order_by(Job.salary_max.desc().nullslast(), Job.scraped_at.desc())
    if sort == SORT_COMPANY:
        return query.order_by(Job.company.asc(), Job.scraped_at.desc())
    return query.order_by(Job.scraped_at.desc())


def job_filter_options(db: Session) -> dict[str, list[str]]:
    boards = [
        row[0]
        for row in db.query(Job.job_board)
        .filter(Job.is_validated.is_(True))
        .distinct()
        .order_by(Job.job_board)
        .all()
        if row[0]
    ]
    locations = [
        row[0]
        for row in db.query(Job.location)
        .filter(Job.is_validated.is_(True), Job.location.isnot(None))
        .distinct()
        .order_by(Job.location)
        .limit(40)
        .all()
        if row[0]
    ]
    return {"job_boards": boards, "locations": locations}
