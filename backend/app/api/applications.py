"""Track job applications per candidate."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.database.session import get_db
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListOut,
    ApplicationOut,
    ApplicationStatusEnum,
    ApplicationUpdate,
)

router = APIRouter()


@router.get("/me", response_model=ApplicationListOut)
def list_my_applications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationListOut:
    candidate = _candidate_or_404(db, user.id)
    rows = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.candidate_id == candidate.id)
        .order_by(Application.updated_at.desc())
        .all()
    )
    items = [_to_out(app, job) for app, job in rows]
    return ApplicationListOut(items=items, total=len(items))


@router.post("/", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    body: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    candidate = _candidate_or_404(db, user.id)
    job = db.query(Job).filter(Job.id == body.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    existing = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == body.job_id)
        .first()
    )
    if existing:
        return _update_row(existing, body.status, body.notes, db, job)

    app = Application(
        candidate_id=candidate.id,
        job_id=body.job_id,
        status=_status(body.status),
        notes=body.notes,
        applied_at=datetime.utcnow() if body.status == ApplicationStatus.APPLIED else None,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return _to_out(app, job)


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: int,
    body: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ApplicationOut:
    candidate = _candidate_or_404(db, user.id)
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    app, job = row
    status_val = body.status if body.status is not None else ApplicationStatusEnum(app.status.value)
    return _update_row(app, status_val, body.notes if body.notes is not None else app.notes, db, job)


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    candidate = _candidate_or_404(db, user.id)
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    db.delete(app)
    db.commit()


def _candidate_or_404(db: Session, user_id: int) -> Candidate:
    candidate = db.query(Candidate).filter(Candidate.user_id == user_id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return candidate


def _status(value: ApplicationStatusEnum) -> ApplicationStatus:
    return ApplicationStatus(value.value)


def _update_row(
    app: Application,
    status: ApplicationStatusEnum,
    notes: str | None,
    db: Session,
    job: Job,
) -> ApplicationOut:
    app.status = _status(status)
    app.notes = notes
    if status == ApplicationStatusEnum.applied and not app.applied_at:
        app.applied_at = datetime.utcnow()
    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return _to_out(app, job)


def _to_out(app: Application, job: Job) -> ApplicationOut:
    return ApplicationOut(
        id=app.id,
        job_id=job.id,
        status=ApplicationStatusEnum(app.status.value),
        notes=app.notes,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        title=job.title,
        company=job.company,
        location=job.location,
        url=job.url,
        job_board=job.job_board,
    )
