"""Job listing and scrape trigger endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Job, User
from app.database.session import get_db
from app.schemas.job import JobListOut, JobOut, ScrapeTaskOut
from app.tasks.scrape_tasks import scrape_pracuj_task, scrape_rocketjobs_task

router = APIRouter()

SCRAPE_HANDLERS = {
    "pracuj": scrape_pracuj_task,
    "rocketjobs": scrape_rocketjobs_task,
}


@router.get("/", response_model=JobListOut)
def list_jobs(
    skip: int = 0,
    limit: int = 50,
    validated_only: bool = True,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> JobListOut:
    query = db.query(Job)
    if validated_only:
        query = query.filter(Job.is_validated.is_(True))
    total = query.count()
    items = query.order_by(Job.scraped_at.desc()).offset(skip).limit(limit).all()
    return JobListOut(items=items, total=total)


@router.post("/scrape/{board}", response_model=ScrapeTaskOut)
def trigger_scrape(
    board: str,
    _user: User = Depends(get_current_user),
) -> ScrapeTaskOut:
    handler = SCRAPE_HANDLERS.get(board)
    if not handler:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown job board")
    result = handler.delay()
    return ScrapeTaskOut(
        task_id=result.id,
        job_board=board,
        message=f"Scrape queued for {board}",
    )
