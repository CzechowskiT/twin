"""Filtered job listing for dashboard."""

from sqlalchemy.orm import Query, Session

from app.database.models import Job
from app.services.job_search import apply_min_salary_filter, job_text_token_clause, tokenize_job_search

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
    tokens = tokenize_job_search(q, title_terms)
    clause = job_text_token_clause(tokens)
    if clause is not None:
        query = query.filter(clause)
    if location:
        query = query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if job_board:
        query = query.filter(Job.job_board.ilike(f"%{job_board.strip()}%"))
    query = apply_min_salary_filter(query, min_salary)

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
