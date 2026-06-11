"""Recruiter ATS-lite pipeline — list and stage transitions per company."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    ApplicationStatus,
    Candidate,
    Job,
    RecruiterPipelineStatus,
    ScheduledInterview,
)
from app.services.recruiter_match_explanations import build_recruiter_match_summary
from app.utils.slug import slugify_company


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug

PIPELINE_STATUSES = tuple(s.value for s in RecruiterPipelineStatus)

TRANSITION_ACTIONS = frozenset(
    {
        "to_contact",
        "to_contact",
        "on_hold",
        "reject",
        "reopen",
    }
)

NEXT_ACTION_BY_STATUS: dict[str, str] = {
    RecruiterPipelineStatus.NEW.value: "review",
    RecruiterPipelineStatus.REVIEW.value: "review",
    RecruiterPipelineStatus.ACCEPTED.value: "accepted",
    RecruiterPipelineStatus.TO_CONTACT.value: "to_contact",
    RecruiterPipelineStatus.INVITED.value: "invited",
    RecruiterPipelineStatus.REJECTED.value: "rejected",
    RecruiterPipelineStatus.ON_HOLD.value: "on_hold",
}


def _has_scheduled_interview(db: Session, application_id: int) -> bool:
    row = (
        db.query(ScheduledInterview.id)
        .filter(ScheduledInterview.application_id == application_id)
        .first()
    )
    return row is not None


def effective_pipeline_status(app: Application, *, has_interview: bool = False) -> str:
    """Resolve pipeline stage from explicit field or legacy Application.status."""
    stored = (app.recruiter_pipeline_status or "").strip().lower()
    if stored in PIPELINE_STATUSES:
        return stored
    status = app.status
    if status == ApplicationStatus.REJECTED:
        return RecruiterPipelineStatus.REJECTED.value
    if status == ApplicationStatus.INTERVIEW:
        if has_interview:
            return RecruiterPipelineStatus.INVITED.value
        return RecruiterPipelineStatus.ACCEPTED.value
    if status in (ApplicationStatus.APPLIED, ApplicationStatus.PENDING):
        if status == ApplicationStatus.PENDING and not app.applied_at:
            return RecruiterPipelineStatus.NEW.value
        return RecruiterPipelineStatus.REVIEW.value
    return RecruiterPipelineStatus.REVIEW.value


def sync_pipeline_on_inbox_accept(app: Application) -> None:
    app.recruiter_pipeline_status = RecruiterPipelineStatus.ACCEPTED.value


def sync_pipeline_on_inbox_decline(app: Application) -> None:
    app.recruiter_pipeline_status = RecruiterPipelineStatus.REJECTED.value


def _application_row(
    db: Session,
    app: Application,
    job: Job,
    cand: Candidate,
    *,
    locale: str,
) -> dict:
    has_interview = _has_scheduled_interview(db, app.id)
    pipeline_status = effective_pipeline_status(app, has_interview=has_interview)
    item = {
        "application_id": app.id,
        "job_title": job.title,
        "company": job.company,
        "candidate_name": (cand.name or "").strip() or "Candidate",
        "status": app.status.value,
        "pipeline_status": pipeline_status,
        "next_action": NEXT_ACTION_BY_STATUS.get(pipeline_status, "review"),
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
    }
    item.update(build_recruiter_match_summary(db, cand, job, locale=locale))
    return item


def build_recruiter_pipeline(
    db: Session,
    *,
    company_slug: str,
    limit: int = 50,
    locale: str = "en",
    status_filter: str | None = None,
) -> dict:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(Application, Job, Candidate)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(
            Application.status.in_(
                (
                    ApplicationStatus.PENDING,
                    ApplicationStatus.APPLIED,
                    ApplicationStatus.INTERVIEW,
                    ApplicationStatus.REJECTED,
                )
            ),
        )
        .order_by(Application.updated_at.desc())
        .limit(300)
        .all()
    )
    items: list[dict] = []
    counts: dict[str, int] = {s: 0 for s in PIPELINE_STATUSES}
    filt = (status_filter or "all").strip().lower()
    for app, job, cand in rows:
        if slugify_company(job.company) != slug:
            continue
        row = _application_row(db, app, job, cand, locale=locale)
        ps = row["pipeline_status"]
        counts[ps] = counts.get(ps, 0) + 1
        if filt != "all" and ps != filt:
            continue
        items.append(row)
        if len(items) >= limit:
            break
    return {
        "company_slug": slug,
        "items": items,
        "total": len(items),
        "counts_by_status": counts,
    }


def transition_recruiter_pipeline(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    action: str,
) -> dict:
    slug = _require_company_slug(company_slug)
    act = action.strip().lower()
    if act not in TRANSITION_ACTIONS:
        raise ValueError(f"action must be one of: {', '.join(sorted(TRANSITION_ACTIONS))}")
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id)
        .first()
    )
    if not row:
        raise ValueError("Application not found.")
    app, job = row
    if slugify_company(job.company) != slug:
        raise ValueError("Application does not belong to this company.")
    current = effective_pipeline_status(
        app, has_interview=_has_scheduled_interview(db, app.id)
    )
    if act == "to_contact":
        if current not in (
            RecruiterPipelineStatus.ACCEPTED.value,
            RecruiterPipelineStatus.ON_HOLD.value,
        ):
            raise ValueError("Only accepted or on-hold candidates can move to contact.")
        app.recruiter_pipeline_status = RecruiterPipelineStatus.TO_CONTACT.value
        if app.status not in (ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED):
            app.status = ApplicationStatus.INTERVIEW
    elif act == "to_contact":
        if current not in (
            RecruiterPipelineStatus.ACCEPTED.value,
            RecruiterPipelineStatus.TO_CONTACT.value,
            RecruiterPipelineStatus.ON_HOLD.value,
        ):
            raise ValueError("Candidate must be accepted or in contact before invite.")
        app.recruiter_pipeline_status = RecruiterPipelineStatus.INVITED.value
        app.status = ApplicationStatus.INTERVIEW
    elif act == "on_hold":
        if current == RecruiterPipelineStatus.REJECTED.value:
            raise ValueError("Rejected candidates cannot be put on hold.")
        app.recruiter_pipeline_status = RecruiterPipelineStatus.ON_HOLD.value
    elif act == "reject":
        app.recruiter_pipeline_status = RecruiterPipelineStatus.REJECTED.value
        app.status = ApplicationStatus.REJECTED
    elif act == "reopen":
        if current not in (
            RecruiterPipelineStatus.REJECTED.value,
            RecruiterPipelineStatus.ON_HOLD.value,
        ):
            raise ValueError("Only rejected or on-hold rows can reopen to review.")
        app.recruiter_pipeline_status = RecruiterPipelineStatus.REVIEW.value
        app.status = ApplicationStatus.APPLIED
        app.recruiter_feedback_raw = None
    app.updated_at = datetime.now(timezone.utc)
    db.add(app)
    db.commit()
    db.refresh(app)
    has_interview = _has_scheduled_interview(db, app.id)
    pipeline_status = effective_pipeline_status(app, has_interview=has_interview)
    return {
        "application_id": app.id,
        "status": app.status.value,
        "pipeline_status": pipeline_status,
        "next_action": NEXT_ACTION_BY_STATUS.get(pipeline_status, "review"),
    }
