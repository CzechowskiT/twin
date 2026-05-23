"""Build read-only investor demo snapshot from DB or static fallback."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    Application,
    AutoApplyConsent,
    AutoApplyRun,
    Candidate,
    Job,
    JobMatch,
    ScheduledInterview,
    User,
)
from app.schemas.demo import (
    DemoApplicationOut,
    DemoAutoApplyOut,
    DemoCandidateOut,
    DemoInterviewOut,
    DemoJobMatchOut,
    DemoNightlyRunOut,
    DemoSnapshotOut,
)
from app.services.investor_demo_seed import DEMO_JOB_PREFIX, demo_email_from_env

logger = logging.getLogger(__name__)

_STATIC_MATCHES = [
    DemoJobMatchOut(
        title="Senior Python Developer",
        company="Nova Hiring PL",
        location="Warsaw · hybrid",
        score=96.0,
        url="https://www.pracuj.pl/praca/senior-python-developer-investor-demo-1",
        job_board="pracuj",
    ),
    DemoJobMatchOut(
        title="Staff Backend Engineer",
        company="Twin Labs",
        location="Remote · Poland",
        score=94.0,
        url="https://www.pracuj.pl/praca/staff-backend-engineer-investor-demo-2",
        job_board="pracuj",
    ),
    DemoJobMatchOut(
        title="Platform Engineer (Python)",
        company="CalendarFlow",
        location="Kraków",
        score=91.0,
        url="https://www.pracuj.pl/praca/platform-engineer-investor-demo-3",
        job_board="pracuj",
    ),
]


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _static_snapshot(settings: Settings, *, user_found: bool) -> DemoSnapshotOut:
    now = datetime.now(timezone.utc)
    start = now + timedelta(days=3)
    end = start + timedelta(hours=1)
    return DemoSnapshotOut(
        source="static_fallback",
        generated_at=_iso(now) or "",
        demo_user_configured=user_found,
        candidate=DemoCandidateOut(
            name="Alex Kowalski (demo)",
            location="Warsaw",
            experience_years=8,
            has_cv=True,
        ),
        top_matches=list(_STATIC_MATCHES),
        application=DemoApplicationOut(
            status="applied",
            job_title="Senior Python Developer",
            company="Nova Hiring PL",
            applied_at=_iso(now - timedelta(days=2)),
        ),
        scheduled_interview=DemoInterviewOut(
            company_name="Nova Hiring PL",
            job_title="Senior Python Developer",
            interview_start=_iso(start) or "",
            interview_end=_iso(end) or "",
            timezone="Europe/Warsaw",
            meeting_link="https://meet.google.com/demo-investor-interview",
            status="scheduled",
        ),
        auto_apply=DemoAutoApplyOut(
            consent_active=True,
            min_score_threshold=85.0,
            daily_limit=5,
            total_applications_submitted=2,
            last_run_at=_iso(now - timedelta(hours=10)),
        ),
    )


def build_demo_snapshot(db: Session, settings: Settings) -> DemoSnapshotOut:
    """Load seeded demo user when present; otherwise return marketing-safe static data."""
    try:
        return _build_demo_snapshot(db, settings)
    except Exception:
        logger.exception("demo snapshot live build failed; using static fallback")
        return _static_snapshot(settings, user_found=True)


def _build_demo_snapshot(db: Session, settings: Settings) -> DemoSnapshotOut:
    email = (settings.demo_user_email or demo_email_from_env()).strip().lower()
    now = datetime.now(timezone.utc)
    user = (
        db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if email
        else None
    )
    if user is None:
        return _static_snapshot(settings, user_found=False)

    cand = db.execute(select(Candidate).where(Candidate.user_id == user.id)).scalar_one_or_none()
    if cand is None:
        return _static_snapshot(settings, user_found=True)

    match_rows = (
        db.execute(
            select(JobMatch, Job)
            .join(Job, Job.id == JobMatch.job_id)
            .where(JobMatch.candidate_id == cand.id)
            .order_by(JobMatch.score.desc())
            .limit(5)
        )
        .all()
    )
    matches_raw: list[dict[str, object]] = [
        {
            "job_id": job.id,
            "score": float(jm.score or 0.0),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "url": job.url,
            "job_board": job.job_board,
        }
        for jm, job in match_rows
    ]
    # Never run full-catalog matching here — public /demo must stay fast (prod has 600+ jobs).
    if not matches_raw:
        demo_jobs = (
            db.execute(
                select(Job).where(
                    Job.job_board == "pracuj",
                    Job.external_id.like(f"{DEMO_JOB_PREFIX}%"),
                    Job.is_validated.is_(True),
                )
            )
            .scalars()
            .all()
        )
        for job in demo_jobs[:5]:
            matches_raw.append(
                {
                    "job_id": job.id,
                    "score": 90.0,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "url": job.url,
                    "job_board": job.job_board,
                }
            )

    top_matches = [
        DemoJobMatchOut(
            job_id=m.get("job_id"),
            title=str(m["title"]),
            company=str(m["company"]),
            location=m.get("location"),
            score=float(m["score"]),
            url=m.get("url"),
            job_board=m.get("job_board"),
        )
        for m in matches_raw[:5]
    ]

    application_row = (
        db.execute(
            select(Application).where(Application.candidate_id == cand.id).order_by(Application.id.desc())
        )
        .scalars()
        .first()
    )
    application_out: DemoApplicationOut | None = None
    job_for_app: Job | None = None
    if application_row is not None:
        job_for_app = db.get(Job, application_row.job_id)
        application_out = DemoApplicationOut(
            id=application_row.id,
            status=application_row.status.value if hasattr(application_row.status, "value") else str(application_row.status),
            job_title=job_for_app.title if job_for_app else "Role",
            company=job_for_app.company if job_for_app else "Company",
            applied_at=_iso(application_row.applied_at),
        )

    interview_row = (
        db.execute(
            select(ScheduledInterview)
            .where(ScheduledInterview.user_id == user.id)
            .order_by(ScheduledInterview.interview_start.desc())
        )
        .scalars()
        .first()
    )
    interview_out: DemoInterviewOut | None = None
    if interview_row is not None:
        interview_out = DemoInterviewOut(
            id=interview_row.id,
            company_name=interview_row.company_name,
            job_title=interview_row.job_title,
            interview_start=_iso(interview_row.interview_start) or "",
            interview_end=_iso(interview_row.interview_end) or "",
            timezone=interview_row.timezone,
            meeting_link=interview_row.meeting_link,
            status=interview_row.status,
        )

    consent = (
        db.execute(select(AutoApplyConsent).where(AutoApplyConsent.candidate_id == cand.id))
        .scalar_one_or_none()
    )
    auto_out: DemoAutoApplyOut | None = None
    if consent is not None:
        auto_out = DemoAutoApplyOut(
            consent_active=bool(consent.is_active),
            min_score_threshold=float(consent.min_score_threshold or 85.0),
            daily_limit=int(consent.daily_limit or 5),
            total_applications_submitted=int(consent.total_applications_submitted or 0),
            last_run_at=_iso(consent.last_run_at),
        )

    nightly = db.query(AutoApplyRun).order_by(AutoApplyRun.started_at.desc()).first()
    nightly_out: DemoNightlyRunOut | None = None
    if nightly is not None:
        nightly_out = DemoNightlyRunOut(
            started_at=_iso(nightly.started_at),
            finished_at=_iso(nightly.finished_at),
            total_users_processed=int(nightly.total_users_processed or 0),
            total_applications_submitted=int(nightly.total_applications_submitted or 0),
        )

    return DemoSnapshotOut(
        source="live_db",
        generated_at=_iso(now) or "",
        demo_user_configured=True,
        candidate=DemoCandidateOut(
            name=cand.name or "Demo candidate",
            location=cand.location,
            experience_years=int(cand.experience_years or 0),
            has_cv=bool(
                (cand.cv_text and str(cand.cv_text).strip())
                or (cand.resume_path and str(cand.resume_path).strip())
                or (cand.cv_filename and str(cand.cv_filename).strip())
            ),
        ),
        top_matches=top_matches or list(_STATIC_MATCHES),
        application=application_out,
        scheduled_interview=interview_out,
        auto_apply=auto_out,
        nightly_last_run=nightly_out,
    )
