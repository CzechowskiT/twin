"""Job listing and scrape trigger endpoints."""

import logging
import threading
from collections.abc import Callable
from typing import Annotated

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user, require_scrape_user
from app.core.plans import count_tracked_applications, effective_plan_tier, max_tracked_applications
from app.database.models import Application, ApplicationStatus, Candidate, Job, SavedJob, SubmissionStatus, User
from app.services.application_submission import record_submission_one_click
from app.database.session import get_db
from app.matching.matcher import calculate_match_score
from app.schemas.company_intelligence import CompanyIntelBodyOut, CompanyIntelOut, InsiderLanguageOut
from app.schemas.job import (
    BoardListOut,
    BoardScrapeResult,
    JobFiltersOut,
    JobListOut,
    JobOut,
    ScrapeAllOut,
    ScrapeTaskOut,
)
from app.schemas.job_competitive import JobApplyStatsOut, JobDetailOut, OneClickApplyOut, SkillMatchOut
from app.services.company_intelligence import research_company_for_job
from app.services.job_api_enrichment import job_detail_out, job_out, score_for_candidate
from app.services.job_query import SORT_COMPANY, SORT_NEWEST, SORT_SALARY, apply_job_filters, job_filter_options
from app.services.matching_service import candidate_to_dict, job_to_dict
from app.services.request_locale import locale_from_request
from app.services.skill_matcher import compute_skill_match
from app.scrapers.registry import GLOBAL_BOARD_SPECS, list_boards
from app.tasks.scrape_tasks import (
    GLOBAL_BOARD_SCRAPE_TASKS,
    GREENHOUSE_SCRAPE_TASKS,
    scrape_all_boards_task,
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

_SCRAPE_FALLBACK_MSG = (
    "Kolejka Redis/Celery nie odebrała zadania — uruchomiłem pełny scraping w tle w procesie API "
    "(bez workera). Poczekaj kilka minut i odśwież listę ofert."
)


def _is_brokerish_failure(exc: BaseException) -> bool:
    """True when Redis/broker is down — not for scraper logic failures inside .apply()."""
    if isinstance(exc, (ConnectionError, TimeoutError)):
        return True
    errno = getattr(exc, "errno", None)
    if isinstance(exc, OSError) and errno in {111, 61, 99, 110, 113}:
        return True
    mod = type(exc).__module__.lower()
    if any(x in mod for x in ("kombu", "redis", "amqp", "billiard")):
        return True
    low = str(exc).lower()
    return any(
        n in low
        for n in (
            "connection refused",
            "error 111",
            "name or service not known",
            "could not connect",
            "timeout connecting",
            "redis connection",
            "error 8 connecting",
        )
    )


def _eager_background_run(thread_name: str, thunk: Callable[[], None]) -> None:
    """Run Celery `.delay()` off the request thread so proxies do not time out."""

    def _runner() -> None:
        try:
            thunk()
        except Exception:
            logger.exception("%s failed", thread_name)

    threading.Thread(target=_runner, name=thread_name, daemon=True).start()


def _celery_delay(task, *args, **kwargs):
    """Enqueue Celery `.delay()`; only translate **broker** failures into HTTP 503."""
    try:
        return task.delay(*args, **kwargs)
    except HTTPException:
        raise
    except Exception as exc:
        if not _is_brokerish_failure(exc):
            raise
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

PER_BOARD_SCRAPE_HANDLERS = {
    **LOCAL_SCRAPE_HANDLERS,
    **GLOBAL_BOARD_SCRAPE_TASKS,
    **GREENHOUSE_SCRAPE_TASKS,
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
    skip: Annotated[int, Query(ge=0, description="Pagination offset into the filtered result set.")] = 0,
    limit: Annotated[int, Query(ge=1, le=200, description="Maximum jobs to return (default 50, cap 200).")] = 50,
    validated_only: Annotated[
        bool,
        Query(description="When true (default), only listings that passed validation are returned."),
    ] = True,
    q: Annotated[str | None, Query(description="Free-text search across title, company, and location.")] = None,
    location: Annotated[str | None, Query(description="Filter by city or region (substring match).")] = None,
    job_board: Annotated[str | None, Query(description="Restrict to a single board id (e.g. pracuj, rocketjobs).")] = None,
    min_salary: Annotated[int | None, Query(ge=0, description="Minimum advertised salary (PLN) when present on the listing.")] = None,
    title_terms: Annotated[
        str | None,
        Query(
            description="Comma-separated target titles; any token from these or `q` may match title/description (OR).",
        ),
    ] = None,
    sort: Annotated[str, Query(description=f"Sort order: `{SORT_NEWEST}`, `{SORT_SALARY}`, or `{SORT_COMPANY}`.")] = SORT_NEWEST,
    opportunity_type: Annotated[
        str | None,
        Query(description="Filter by opportunity type: full_time, freelance, contract, or all."),
    ] = None,
    active_feed_only: Annotated[
        bool,
        Query(
            description="When true (default), only listings scraped within job_feed_active_days (45).",
        ),
    ] = True,
    active_within_days: Annotated[
        int | None,
        Query(ge=1, le=120, description="Override active window in days (default from settings)."),
    ] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> JobListOut:
    """Paginated job feed with optional filters and match scores for the authenticated candidate."""
    if sort not in (SORT_NEWEST, SORT_SALARY, SORT_COMPANY):
        sort = SORT_NEWEST
    def validated_jobs_query():
        base = db.query(Job)
        if validated_only:
            base = base.filter(Job.is_validated.is_(True))
        return base

    search_relaxed = False
    query = apply_job_filters(
        validated_jobs_query(),
        q=q,
        location=location,
        job_board=job_board,
        min_salary=min_salary,
        title_terms=title_terms,
        opportunity_type=opportunity_type,
        sort=sort,
        active_feed_only=active_feed_only,
        active_within_days=active_within_days,
    )
    total = query.count()
    if total == 0 and min_salary is not None and min_salary > 0:
        search_relaxed = True
        query = apply_job_filters(
            validated_jobs_query(),
            q=q,
            location=location,
            job_board=job_board,
            min_salary=None,
            title_terms=title_terms,
            opportunity_type=opportunity_type,
            sort=sort,
            active_feed_only=active_feed_only,
            active_within_days=active_within_days,
        )
        total = query.count()
    items = query.offset(skip).limit(limit).all()

    candidate = db.query(Candidate).filter(Candidate.user_id == _user.id).first()
    out_items: list[JobOut] = []
    for job in items:
        sc = score_for_candidate(job, candidate)
        out_items.append(job_out(job, score=sc))

    return JobListOut(items=out_items, total=total, search_relaxed=search_relaxed)


@router.get("/{job_id}", response_model=JobDetailOut)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobDetailOut:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    return job_detail_out(job, score=score_for_candidate(job, candidate))


@router.get("/{job_id}/match-score", response_model=SkillMatchOut)
def get_job_match_score(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SkillMatchOut:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile required")
    result = compute_skill_match(candidate_to_dict(candidate), job_to_dict(job))
    return SkillMatchOut(job_id=job_id, **result)


@router.get("/{job_id}/apply-stats", response_model=JobApplyStatsOut)
def get_job_apply_stats(
    job_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> JobApplyStatsOut:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    total = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id == job_id,
            Application.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED,
        )
        .scalar()
        or 0
    )
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent = (
        db.query(func.count(Application.id))
        .filter(
            Application.job_id == job_id,
            Application.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED,
            Application.submitted_at >= week_ago,
        )
        .scalar()
        or 0
    )
    return JobApplyStatsOut(job_id=job_id, apply_count=int(total), recent_applies_7d=int(recent))


@router.post("/{job_id}/one-click-apply", response_model=OneClickApplyOut)
def one_click_apply(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    locale: str = Depends(locale_from_request),
) -> OneClickApplyOut:
    """Track application as applied using stored profile — no external form fill."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile required")

    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == job_id)
        .first()
    )
    if existing:
        msg = "Already tracked for this role." if locale.startswith("en") else "Ta oferta jest już w Twoim pipeline."
        return OneClickApplyOut(
            application_id=existing.id,
            status=existing.status.value,
            message=msg,
            already_applied=True,
        )

    tier = effective_plan_tier(user)
    cap = max_tracked_applications(tier)
    if cap is not None and count_tracked_applications(db, candidate.id) >= cap:
        detail = (
            f"Free plan supports up to {cap} active tracked applications."
            if locale.startswith("en")
            else f"Plan Free: maks. {cap} aktywnych aplikacji."
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    app = Application(
        candidate_id=candidate.id,
        job_id=job_id,
        status=ApplicationStatus.PENDING,
        notes="One-click apply via TWIN profile",
        applied_at=None,
    )
    db.add(app)
    record_submission_one_click(app, job=job)
    db.commit()
    db.refresh(app)
    msg = (
        "Application prepared in TWIN — open the job link to submit on the employer site."
        if locale.startswith("en")
        else "Aplikacja przygotowana w TWIN — otwórz link oferty, aby wysłać u pracodawcy."
    )
    return OneClickApplyOut(application_id=app.id, status=app.status.value, message=msg)


@router.post("/saved/{job_id}")
def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    existing = (
        db.query(SavedJob)
        .filter(SavedJob.candidate_id == candidate.id, SavedJob.job_id == job_id)
        .first()
    )
    if existing:
        return {"message": "Already saved"}
    db.add(SavedJob(candidate_id=candidate.id, job_id=job_id))
    db.commit()
    return {"message": "Job saved"}


@router.delete("/saved/{job_id}")
def unsave_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    saved = (
        db.query(SavedJob)
        .filter(SavedJob.candidate_id == candidate.id, SavedJob.job_id == job_id)
        .first()
    )
    if saved:
        db.delete(saved)
        db.commit()
    return {"message": "Job unsaved"}


@router.get("/saved", response_model=list[JobOut])
def get_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobOut]:
    candidate = db.query(Candidate).filter(Candidate.user_id == current_user.id).first()
    if not candidate:
        return []
    rows = (
        db.query(Job)
        .join(SavedJob, SavedJob.job_id == Job.id)
        .filter(SavedJob.candidate_id == candidate.id)
        .order_by(SavedJob.created_at.desc())
        .all()
    )
    cand_dict = candidate_to_dict(candidate)
    out: list[JobOut] = []
    for job in rows:
        sc = float(calculate_match_score(cand_dict, job_to_dict(job)))
        out.append(job_out(job, score=sc))
    return out


@router.post("/scrape/all", response_model=ScrapeAllOut)
def trigger_scrape_all(
    sync: bool = False,
    _scrape_user: User = Depends(require_scrape_user),
) -> ScrapeAllOut:
    try:
        if sync:
            try:
                result = scrape_all_boards_task.apply()
            except Exception as exc:
                logger.exception("sync scrape-all failed")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Scrape nie powiódł się: {exc}",
                ) from exc
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

        try:
            async_result = _celery_delay(scrape_all_boards_task)
        except HTTPException as exc:
            if exc.status_code != status.HTTP_503_SERVICE_UNAVAILABLE:
                raise
            logger.warning("scrape/all: broker unavailable, falling back to in-process thread")
            _eager_background_run("twin-scrape-all-fallback", lambda: scrape_all_boards_task.apply())
            return ScrapeAllOut(
                task_id="api-thread-fallback",
                total_saved=0,
                boards={},
                errors={},
                message=_SCRAPE_FALLBACK_MSG,
            )
        return ScrapeAllOut(
            task_id=str(async_result.id),
            total_saved=0,
            boards={},
            errors={},
            message="Scrape all boards queued",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("POST /jobs/scrape/all failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nie udało się uruchomić pełnego scrapingu. Sprawdź logi API albo spróbuj ponownie za chwilę.",
        ) from exc


@router.post("/scrape/{board}", response_model=ScrapeTaskOut)
def trigger_scrape(
    board: str,
    sync: bool = False,
    _scrape_user: User = Depends(require_scrape_user),
) -> ScrapeTaskOut:
    try:
        handler = PER_BOARD_SCRAPE_HANDLERS.get(board)
        if not handler:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown job board")

        if sync:
            try:
                result = handler.apply()
            except Exception as exc:
                logger.exception("sync scrape failed board=%s", board)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Scrape nie powiódł się: {exc}",
                ) from exc
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
            _eager_background_run(f"twin-scrape-{board}", lambda: handler.delay())
            return ScrapeTaskOut(
                task_id="eager-background",
                job_board=board,
                message=f"Scrape started in background for {board} (eager API mode)",
            )

        try:
            async_result = _celery_delay(handler)
        except HTTPException as exc:
            if exc.status_code != status.HTTP_503_SERVICE_UNAVAILABLE:
                raise
            logger.warning("scrape/%s: broker unavailable, falling back to in-process thread", board)

            def _fallback() -> None:
                handler.apply()

            _eager_background_run(f"twin-scrape-{board}-fallback", _fallback)
            return ScrapeTaskOut(
                task_id="api-thread-fallback",
                job_board=board,
                message=_SCRAPE_FALLBACK_MSG,
            )
        return ScrapeTaskOut(
            task_id=str(async_result.id),
            job_board=board,
            message=f"Scrape queued for {board}",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("POST /jobs/scrape/{board} failed board=%s", board)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nie udało się uruchomić scrapingu dla tego portalu. Spróbuj ponownie za chwilę.",
        ) from exc


@router.post("/{job_id}/research", response_model=CompanyIntelOut)
def research_job_company(
    job_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> CompanyIntelOut:
    """US-C051: company priorities, pain points, insider language, cover letter draft."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    intel, researched_at, from_cache = research_company_for_job(db, job)
    body = CompanyIntelBodyOut(
        priorities=intel["priorities"],
        pain_points=intel["pain_points"],
        insider_language=InsiderLanguageOut(**intel["insider_language"]),
        cover_letter_draft=intel["cover_letter_draft"],
    )
    return CompanyIntelOut(
        job_id=job_id,
        company=job.company,
        job_title=job.title,
        intel=body,
        researched_at=researched_at,
        from_cache=from_cache,
    )
