"""Job listing and scrape trigger endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Job, User
from app.database.session import get_db
from app.schemas.job import (
    BoardListOut,
    BoardScrapeResult,
    JobFiltersOut,
    JobListOut,
    ScrapeAllOut,
    ScrapeTaskOut,
)
from app.services.job_query import SORT_COMPANY, SORT_NEWEST, SORT_SALARY, apply_job_filters, job_filter_options
from app.scrapers.registry import GLOBAL_BOARD_SPECS, list_boards
from app.tasks.scrape_tasks import (
    scrape_all_boards_task,
    scrape_global_board_task,
    scrape_justjoin_task,
    scrape_linkedin_sales_task,
    scrape_linkedin_task,
    scrape_praca_task,
    scrape_pracuj_sales_task,
    scrape_pracuj_task,
    scrape_rocketjobs_roles_task,
    scrape_rocketjobs_sales_task,
    scrape_rocketjobs_task,
)

router = APIRouter()

LOCAL_SCRAPE_HANDLERS = {
    "pracuj": scrape_pracuj_task,
    "rocketjobs": scrape_rocketjobs_task,
    "pracuj-sales": scrape_pracuj_sales_task,
    "rocketjobs-sales": scrape_rocketjobs_sales_task,
    "rocketjobs-roles": scrape_rocketjobs_roles_task,
    "justjoin": scrape_justjoin_task,
    "praca": scrape_praca_task,
    "linkedin": scrape_linkedin_task,
    "linkedin-sales": scrape_linkedin_sales_task,
}


@router.get("/boards", response_model=BoardListOut)
def list_job_boards(
    _user: User = Depends(get_current_user),
) -> BoardListOut:
    return BoardListOut(items=list_boards())


@router.get("/filters", response_model=JobFiltersOut)
def job_filters(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> JobFiltersOut:
    opts = job_filter_options(db)
    return JobFiltersOut(**opts)


@router.get("/", response_model=JobListOut)
def list_jobs(
    skip: int = 0,
    limit: int = 50,
    validated_only: bool = True,
    q: str | None = None,
    location: str | None = None,
    job_board: str | None = None,
    min_salary: int | None = None,
    title_terms: str | None = None,
    sort: str = SORT_NEWEST,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> JobListOut:
    if sort not in (SORT_NEWEST, SORT_SALARY, SORT_COMPANY):
        sort = SORT_NEWEST
    query = db.query(Job)
    if validated_only:
        query = query.filter(Job.is_validated.is_(True))
    query = apply_job_filters(
        query,
        q=q,
        location=location,
        job_board=job_board,
        min_salary=min_salary,
        title_terms=title_terms,
        sort=sort,
    )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return JobListOut(items=items, total=total)


@router.post("/scrape/all", response_model=ScrapeAllOut)
def trigger_scrape_all(
    sync: bool = False,
    _user: User = Depends(get_current_user),
) -> ScrapeAllOut:
    if sync:
        result = scrape_all_boards_task.apply()
        data = result.get() if hasattr(result, "get") else result
        errors = data.get("errors", {})
        total = int(data.get("total_saved", 0))
        boards = {
            board_id: BoardScrapeResult(
                scraped=int(entry.get("scraped", 0)),
                saved=int(entry.get("saved", 0)),
                error=str(entry["error"]) if entry.get("error") else None,
            )
            for board_id, entry in data.get("boards", {}).items()
        }
        msg = f"Scrape finished: {total} new jobs saved across all boards"
        if errors:
            failed = ", ".join(sorted(errors.keys()))
            msg += f" ({len(errors)} failed: {failed})"
        return ScrapeAllOut(
            task_id="sync",
            total_saved=total,
            boards=boards,
            errors=errors,
            message=msg,
        )

    async_result = scrape_all_boards_task.delay()
    return ScrapeAllOut(
        task_id=async_result.id,
        total_saved=0,
        boards={},
        errors={},
        message="Scrape all boards queued",
    )


@router.post("/scrape/{board}", response_model=ScrapeTaskOut)
def trigger_scrape(
    board: str,
    sync: bool = False,
    _user: User = Depends(get_current_user),
) -> ScrapeTaskOut:
    is_global = board in GLOBAL_BOARD_SPECS
    handler = LOCAL_SCRAPE_HANDLERS.get(board)
    if not handler and not is_global:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown job board")

    if sync:
        if is_global:
            result = scrape_global_board_task.apply(args=[board])
        else:
            result = handler.apply()
        data = result.get() if hasattr(result, "get") else result
        if isinstance(data, dict) and data.get("error"):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(data["error"]),
            )
        saved = data.get("saved", 0) if isinstance(data, dict) else 0
        scraped = data.get("scraped", 0) if isinstance(data, dict) else 0
        return ScrapeTaskOut(
            task_id="sync",
            job_board=board,
            message=f"Scrape finished: {saved} new jobs saved ({scraped} fetched)",
        )

    if is_global:
        async_result = scrape_global_board_task.delay(board)
    else:
        async_result = handler.delay()
    return ScrapeTaskOut(
        task_id=async_result.id,
        job_board=board,
        message=f"Scrape queued for {board}",
    )
