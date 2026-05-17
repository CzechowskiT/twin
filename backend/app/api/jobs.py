"""Job listing and scrape trigger endpoints."""

import logging
import threading
from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.database.models import Candidate, Job, User
from app.database.session import get_db
from app.matching.matcher import calculate_match_score
from app.schemas.job import (
    BoardListOut,
    BoardScrapeResult,
    JobFiltersOut,
    JobListOut,
    JobOut,
    ScrapeAllOut,
    ScrapeTaskOut,
)
from app.services.job_query import SORT_COMPANY, SORT_NEWEST, SORT_SALARY, apply_job_filters, job_filter_options
from app.services.matching_service import candidate_to_dict, job_to_dict
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
logger = logging.getLogger(__name__)

_CELERY_QUEUE_DETAIL = (
    "Job queue unavailable: cannot reach Redis/Celery broker. On Railway set REDIS_URL (or "
    "CELERY_BROKER_URL) on the API service, run a separate Celery worker "
    "(`celery -A app.tasks.celery_app worker`), then retry."
)


def _eager_background_run(thread_name: str, thunk: Callable[[], None]) -> None:
    """Run Celery `.delay()` off the request thread so proxies do not time out."""

    def _runner() -> None:
        try:
            thunk()
        except Exception:
            logger.exception("%s failed (CELERY_TASK_ALWAYS_EAGER)", thread_name)

    threading.Thread(target=_runner, name=thread_name, daemon=True).start()


def _celery_send(fn: Callable[[], object]) -> object:
    """Run a Celery `.delay()` / `.apply()`; translate broker errors into a clear 503."""
    try:
        return fn()
    except Exception as exc:
        logger.warning("Celery enqueue failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_CELERY_QUEUE_DETAIL,
        ) from exc


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

    candidate = db.query(Candidate).filter(Candidate.user_id == _user.id).first()
    cand_dict = candidate_to_dict(candidate) if candidate else None
    out_items: list[JobOut] = []
    for job in items:
        base = JobOut.model_validate(job, from_attributes=True)
        if cand_dict is None:
            out_items.append(base)
            continue
        raw = float(calculate_match_score(cand_dict, job_to_dict(job)))
        out_items.append(base.model_copy(update={"score": raw}))

    return JobListOut(items=out_items, total=total)


@router.post("/scrape/all", response_model=ScrapeAllOut)
def trigger_scrape_all(
    sync: bool = False,
    _user: User = Depends(get_current_user),
) -> ScrapeAllOut:
    if sync:
        result = _celery_send(lambda: scrape_all_boards_task.apply())
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

    # Eager mode runs the task inside the API process; doing that in this request would exceed
    # typical reverse-proxy timeouts (e.g. Vercel 45s) and can surface as opaque 500s. Offload to a
    # daemon thread so the client gets an immediate 200 while scraping continues.
    if get_settings().celery_task_always_eager:
        _eager_background_run("twin-scrape-all-eager", lambda: scrape_all_boards_task.delay())
        return ScrapeAllOut(
            task_id="eager-background",
            total_saved=0,
            boards={},
            errors={},
            message="Scrape all boards started in background (eager API mode)",
        )

    async_result = _celery_send(lambda: scrape_all_boards_task.delay())
    return ScrapeAllOut(
        task_id=str(async_result.id),
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
            result = _celery_send(lambda: scrape_global_board_task.apply(args=[board]))
        else:
            result = _celery_send(lambda: handler.apply())
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

    if get_settings().celery_task_always_eager:
        if is_global:
            _eager_background_run(f"twin-scrape-{board}", lambda b=board: scrape_global_board_task.delay(b))
        else:
            assert handler is not None
            _eager_background_run(f"twin-scrape-{board}", lambda: handler.delay())
        return ScrapeTaskOut(
            task_id="eager-background",
            job_board=board,
            message=f"Scrape started in background for {board} (eager API mode)",
        )

    if is_global:
        async_result = _celery_send(lambda: scrape_global_board_task.delay(board))
    else:
        async_result = _celery_send(lambda: handler.delay())
    return ScrapeTaskOut(
        task_id=str(async_result.id),
        job_board=board,
        message=f"Scrape queued for {board}",
    )
