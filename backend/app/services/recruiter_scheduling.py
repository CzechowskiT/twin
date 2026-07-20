"""Manual recruiter interview scheduling — slot storage only, no calendar provider."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, Candidate, Job, RecruiterPipelineStatus
from app.utils.slug import slugify_company

VALID_SCHEDULING_STATUSES = frozenset({"invited", "interview_scheduled"})


def _require_company_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _parse_slot_datetime(slot_date: str, slot_time: str) -> datetime:
    date_part = slot_date.strip()
    time_part = slot_time.strip()
    if not date_part or not time_part:
        raise ValueError("slot_date and slot_time are required.")
    try:
        return datetime.fromisoformat(f"{date_part}T{time_part}")
    except ValueError as exc:
        raise ValueError("slot_date must be YYYY-MM-DD and slot_time HH:MM.") from exc


def _scheduling_row_fields(app: Application) -> dict:
    return {
        "scheduling_status": app.recruiter_scheduling_status,
        "manual_slot_at": app.recruiter_manual_slot_at.isoformat() if app.recruiter_manual_slot_at else None,
        "manual_slot_duration_minutes": app.recruiter_manual_slot_duration_minutes,
        "manual_meeting_link": app.recruiter_manual_meeting_link,
    }


def scheduling_fields_for_inbox_item(app: Application) -> dict:
    return _scheduling_row_fields(app)


def _load_owned_application(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
) -> tuple[Application, Job]:
    slug = _require_company_slug(company_slug)
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
    return app, job


def is_recruiter_scheduling_eligible(app: Application) -> bool:
    if app.status != ApplicationStatus.INTERVIEW:
        return False
    stored = (app.recruiter_pipeline_status or "").strip().lower()
    if stored in (
        RecruiterPipelineStatus.ACCEPTED.value,
        RecruiterPipelineStatus.TO_CONTACT.value,
        RecruiterPipelineStatus.INVITED.value,
    ):
        return True
    return not stored


def save_recruiter_manual_schedule(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    slot_date: str,
    slot_time: str,
    duration_minutes: int | None,
    meeting_link: str | None,
    scheduling_status: str,
) -> dict:
    app, _job = _load_owned_application(db, company_slug=company_slug, application_id=application_id)
    if not is_recruiter_scheduling_eligible(app):
        raise ValueError("Scheduling is only available for accepted candidates.")
    status = scheduling_status.strip().lower()
    if status not in VALID_SCHEDULING_STATUSES:
        raise ValueError("scheduling_status must be invited or interview_scheduled.")
    slot_at = _parse_slot_datetime(slot_date, slot_time)
    duration = duration_minutes if duration_minutes is not None else 45
    if duration < 15 or duration > 480:
        raise ValueError("duration_minutes must be between 15 and 480.")
    link = (meeting_link or "").strip() or None
    if link and len(link) > 2000:
        raise ValueError("meeting_link is too long.")
    app.recruiter_scheduling_status = status
    app.recruiter_manual_slot_at = slot_at
    app.recruiter_manual_slot_duration_minutes = duration
    app.recruiter_manual_meeting_link = link
    app.status = ApplicationStatus.INTERVIEW
    app.recruiter_pipeline_status = RecruiterPipelineStatus.INVITED.value
    app.updated_at = datetime.now(timezone.utc)
    db.add(app)
    db.commit()
    db.refresh(app)
    if status == "interview_scheduled":
        try:
            from app.services.product_funnel import emit_funnel_event

            cand = db.query(Candidate).filter(Candidate.id == app.candidate_id).first()
            if cand is not None:
                emit_funnel_event(
                    db,
                    event_name="interview_scheduled",
                    user_id=cand.user_id,
                    properties={
                        "provider": "recruiter_manual",
                        "application_id": app.id,
                    },
                    once=False,
                    commit=True,
                )
        except Exception:
            pass
    return {"application_id": app.id, "status": app.status.value, **_scheduling_row_fields(app)}
