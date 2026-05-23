"""Idempotent investor demo data (user, jobs, matches, application, interview)."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.models import (
    Application,
    ApplicationStatus,
    AutoApplyConsent,
    AutoApplyRun,
    Candidate,
    Job,
    JobMatch,
    ScheduledInterview,
    User,
)
from app.services.matching_service import find_top_matches

DEMO_BOARD = "pracuj"
DEMO_JOB_PREFIX = "investor-demo-"
# Primary pracuj investor-demo job used for live apply on /demo (founder walkthrough).
DEMO_APPLY_JOB_EXTERNAL_ID = f"{DEMO_JOB_PREFIX}python-lead"
DEFAULT_DEMO_EMAIL = "demo@twin.career"
DEMO_RECRUITER_COMPANY = "Nova Hiring PL"

CV_TEXT = """\
Alex Kowalski — Senior Python Engineer

Summary: 8+ years building APIs and data pipelines with Python, FastAPI, PostgreSQL, and Redis.
Led delivery for B2B SaaS hiring products; comfortable with async workers (Celery) and cloud deploys.

Skills: Python, FastAPI, PostgreSQL, SQLAlchemy, Redis, Celery, Docker, pytest, TypeScript, React.

Experience:
- Staff Engineer, HiringTech PL (2020–present): matching services, GDPR consent flows, calendar integrations.
- Backend Developer, FinScale (2016–2020): payment webhooks, observability, on-call.

Education: MSc Computer Science, Warsaw University of Technology.
Languages: Polish (native), English (C1).
"""

DEMO_JOBS: list[dict[str, object]] = [
    {
        "external_id": f"{DEMO_JOB_PREFIX}python-lead",
        "title": "Senior Python Developer",
        "company": "Nova Hiring PL",
        "location": "Warsaw · hybrid",
        "description": (
            "Own backend services in FastAPI and PostgreSQL. "
            "Ship matching, consent, and calendar features for candidates."
        ),
        "requirements": "Python FastAPI PostgreSQL Celery Redis pytest 5+ years",
        "salary_min": 22000,
        "salary_max": 32000,
        "url": "https://www.pracuj.pl/praca/senior-python-developer-investor-demo-1",
        "match_score": 96.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}backend-staff",
        "title": "Staff Backend Engineer",
        "company": "Twin Labs",
        "location": "Remote · Poland",
        "description": "Design scalable APIs, Celery tasks, and investor-grade observability.",
        "requirements": "Python FastAPI SQLAlchemy async workers PostgreSQL",
        "salary_min": 28000,
        "salary_max": 38000,
        "url": "https://www.pracuj.pl/praca/staff-backend-engineer-investor-demo-2",
        "match_score": 94.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}platform",
        "title": "Platform Engineer (Python)",
        "company": "CalendarFlow",
        "location": "Kraków",
        "description": "Integrate Google Calendar and ICS feeds for interview scheduling.",
        "requirements": "Python FastAPI Google APIs PostgreSQL Docker",
        "salary_min": 20000,
        "salary_max": 30000,
        "url": "https://www.pracuj.pl/praca/platform-engineer-investor-demo-3",
        "match_score": 92.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}data-pipeline",
        "title": "Senior Data Engineer (Python)",
        "company": "SignalWorks",
        "location": "Warsaw · remote-friendly",
        "description": "Build ETL and ranking features for a hiring marketplace.",
        "requirements": "Python PostgreSQL Redis Celery data pipelines 4+ years",
        "salary_min": 24000,
        "salary_max": 34000,
        "url": "https://www.pracuj.pl/praca/data-engineer-investor-demo-4",
        "match_score": 91.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}api-lead",
        "title": "API Engineering Lead",
        "company": "Acceptance Labs",
        "location": "Gdańsk · hybrid",
        "description": "Lead FastAPI services, consent flows, and calendar export for candidates.",
        "requirements": "Python FastAPI leadership PostgreSQL GDPR hiring tech",
        "salary_min": 30000,
        "salary_max": 42000,
        "url": "https://www.pracuj.pl/praca/api-lead-investor-demo-5",
        "match_score": 93.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}sales-director",
        "title": "Sales Director — B2B SaaS",
        "company": "ScalePath PL",
        "location": "Warsaw · hybrid",
        "description": "Own enterprise pipeline, coach AEs, and hit net-new ARR targets in Poland.",
        "requirements": "B2B SaaS sales leadership director enterprise PLN quota",
        "salary_min": 18000,
        "salary_max": 28000,
        "url": "https://www.pracuj.pl/praca/sales-director-investor-demo-6",
        "match_score": 88.0,
    },
    {
        "external_id": f"{DEMO_JOB_PREFIX}cso",
        "title": "Chief Revenue Officer",
        "company": "RevenueForge",
        "location": "Remote · Poland",
        "description": "Executive owner of GTM, partnerships, and revenue operations for a hiring platform.",
        "requirements": "CRO chief revenue officer executive GTM B2B",
        "salary_min": 25000,
        "salary_max": 40000,
        "url": "https://www.pracuj.pl/praca/chief-revenue-officer-investor-demo-7",
        "match_score": 86.0,
    },
]


def demo_email_from_env() -> str:
    return (os.environ.get("DEMO_USER_EMAIL") or DEFAULT_DEMO_EMAIL).strip().lower()


def is_investor_demo_job(job: Job | None) -> bool:
    """True for seeded investor-demo rows (synthetic Pracuj URLs — no live portal submit)."""
    if job is None:
        return False
    ext = (job.external_id or "").strip()
    return ext.startswith(DEMO_JOB_PREFIX)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def upsert_demo_jobs(db: Session) -> list[Job]:
    """Create or refresh investor-demo job rows (idempotent on external_id)."""
    jobs: list[Job] = []
    for spec in DEMO_JOBS:
        ext = str(spec["external_id"])
        row = db.execute(
            select(Job).where(Job.job_board == DEMO_BOARD, Job.external_id == ext)
        ).scalar_one_or_none()
        if row is None:
            row = Job(job_board=DEMO_BOARD, external_id=ext)
            db.add(row)
        row.title = str(spec["title"])
        row.company = str(spec["company"])
        row.location = str(spec.get("location"))
        row.description = str(spec["description"])
        row.requirements = str(spec["requirements"])
        row.url = str(spec["url"])
        row.salary_min = int(spec["salary_min"])  # type: ignore[arg-type]
        row.salary_max = int(spec["salary_max"])  # type: ignore[arg-type]
        row.is_validated = True
        row.scraped_at = _now()
        jobs.append(row)
    db.flush()
    return jobs


def upsert_demo_user(
    db: Session,
    *,
    email: str,
    password: str,
    reset_password: bool,
) -> User:
    now = _now()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        user = User(email=email, hashed_password=hash_password(password), is_active=True)
        db.add(user)
    elif reset_password:
        user.hashed_password = hash_password(password)
    user.gdpr_consent_at = user.gdpr_consent_at or now
    user.terms_of_service_accepted_at = user.terms_of_service_accepted_at or now
    user.job_data_processing_consent_at = user.job_data_processing_consent_at or now
    user.ai_matching_consent_at = user.ai_matching_consent_at or now
    user.email_verified_at = user.email_verified_at or now
    # Always refresh so re-seed repairs prod accounts stuck in onboarding.
    user.onboarding_completed_at = now
    user.plan_tier = "free"
    user.subscription_status = None
    db.flush()
    return user


def upsert_demo_candidate(db: Session, user: User) -> Candidate:
    now = _now()
    cand = db.execute(select(Candidate).where(Candidate.user_id == user.id)).scalar_one_or_none()
    if cand is None:
        cand = Candidate(user_id=user.id, name="Alex Kowalski (demo)")
        db.add(cand)
    cand.name = "Alex Kowalski (demo)"
    cand.skills = json.dumps(
        ["python", "fastapi", "postgresql", "celery", "redis", "docker", "pytest"]
    )
    cand.preferred_job_titles = json.dumps(
        ["Senior Python Developer", "Staff Backend Engineer", "Platform Engineer"]
    )
    cand.experience_years = 8
    cand.desired_salary = 28000
    cand.location = "Warsaw"
    cand.cv_text = CV_TEXT
    cand.cv_filename = "investor-demo-cv.txt"
    cand.cv_uploaded_at = now
    db.flush()
    return cand


def upsert_demo_matches(db: Session, candidate: Candidate, jobs: list[Job]) -> list[JobMatch]:
    """Persist high match_score rows for demo jobs (fixed scores for stable investor UI)."""
    by_ext = {j.external_id: j for j in jobs}
    matches: list[JobMatch] = []
    for spec in DEMO_JOBS:
        ext = str(spec["external_id"])
        job = by_ext.get(ext)
        if job is None:
            continue
        score = float(spec.get("match_score", 90.0))
        row = db.execute(
            select(JobMatch).where(
                JobMatch.candidate_id == candidate.id,
                JobMatch.job_id == job.id,
            )
        ).scalar_one_or_none()
        if row is None:
            row = JobMatch(candidate_id=candidate.id, job_id=job.id, score=score)
            db.add(row)
        else:
            row.score = score
        matches.append(row)
    db.flush()
    return matches


def upsert_demo_application(db: Session, candidate: Candidate, job: Job) -> Application:
    app = db.execute(
        select(Application).where(
            Application.candidate_id == candidate.id,
            Application.job_id == job.id,
        )
    ).scalar_one_or_none()
    now = _now()
    if app is None:
        app = Application(candidate_id=candidate.id, job_id=job.id)
        db.add(app)
    app.status = ApplicationStatus.APPLIED
    app.applied_at = app.applied_at or now
    app.notes = "Investor demo — applied for CV optimize / prep flow."
    app.auto_applied = False
    db.flush()
    return app


def upsert_demo_interview(
    db: Session, user: User, application: Application, job: Job
) -> ScheduledInterview:
    start = _now() + timedelta(days=3)
    end = start + timedelta(hours=1)
    row = (
        db.execute(
            select(ScheduledInterview).where(
                ScheduledInterview.user_id == user.id,
                ScheduledInterview.application_id == application.id,
            )
        )
        .scalars()
        .first()
    )
    if row is None:
        row = ScheduledInterview(
            user_id=user.id,
            application_id=application.id,
            company_name=job.company,
            job_title=job.title,
            interview_start=start,
            interview_end=end,
        )
        db.add(row)
    row.company_name = job.company
    row.job_title = job.title
    row.interview_start = start
    row.interview_end = end
    row.timezone = "Europe/Warsaw"
    row.meeting_link = "https://meet.google.com/demo-investor-interview"
    row.interview_type = "video"
    row.status = "scheduled"
    row.calendar_provider = "google"
    db.flush()
    return row


def upsert_demo_auto_apply(db: Session, candidate: Candidate) -> None:
    consent = (
        db.execute(select(AutoApplyConsent).where(AutoApplyConsent.candidate_id == candidate.id))
        .scalar_one_or_none()
    )
    now = _now()
    if consent is None:
        consent = AutoApplyConsent(candidate_id=candidate.id)
        db.add(consent)
    consent.is_active = True
    consent.consent_given_at = consent.consent_given_at or now
    consent.min_score_threshold = 85.0
    consent.daily_limit = 5
    consent.total_applications_submitted = max(int(consent.total_applications_submitted or 0), 2)
    consent.last_run_at = now - timedelta(hours=10)

    recent = (
        db.execute(select(AutoApplyRun).order_by(AutoApplyRun.started_at.desc()).limit(1))
        .scalar_one_or_none()
    )
    stale = True
    if recent is not None and recent.started_at is not None:
        started = recent.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        stale = (now - started).total_seconds() > 86400
    if recent is None or stale:
        run = AutoApplyRun(
            started_at=now - timedelta(hours=8),
            finished_at=now - timedelta(hours=7, minutes=55),
            total_users_processed=1,
            total_applications_submitted=2,
            total_applications_failed=0,
            stats_json=json.dumps({"demo": True, "source": "seed-investor-demo"}),
        )
        db.add(run)


def _is_recruiter_demo_application(app: Application, job: Job) -> bool:
    ext = (job.external_id or "").strip()
    if ext.startswith(DEMO_JOB_PREFIX):
        return True
    notes = (app.notes or "").lower()
    return "demo" in notes or "investor demo" in notes


def ensure_recruiter_inbox_demo(
    db: Session,
    *,
    company: str = DEMO_RECRUITER_COMPANY,
) -> dict[str, int | str]:
    """Reset/create APPLIED rows for recruiter batch inbox (idempotent; safe on prod)."""
    now = _now()
    upsert_demo_jobs(db)
    jobs = list(
        db.execute(
            select(Job)
            .where(Job.company == company, Job.is_validated.is_(True))
            .order_by(Job.id)
        ).scalars()
    )
    reset = 0
    created = 0
    for job in jobs:
        apps = list(
            db.execute(select(Application).where(Application.job_id == job.id)).scalars()
        )
        for app in apps:
            if app.status not in (ApplicationStatus.APPLIED, ApplicationStatus.INTERVIEW):
                continue
            if app.status == ApplicationStatus.INTERVIEW and _is_recruiter_demo_application(app, job):
                app.status = ApplicationStatus.APPLIED
                app.applied_at = app.applied_at or now
                reset += 1
    primary = next((j for j in jobs if j.external_id == DEMO_APPLY_JOB_EXTERNAL_ID), jobs[0] if jobs else None)
    demo_user = db.execute(select(User).where(User.email == demo_email_from_env())).scalar_one_or_none()
    if demo_user and primary is not None:
        demo_cand = db.execute(
            select(Candidate).where(Candidate.user_id == demo_user.id)
        ).scalar_one_or_none()
        if demo_cand is not None:
            row = db.execute(
                select(Application).where(
                    Application.candidate_id == demo_cand.id,
                    Application.job_id == primary.id,
                )
            ).scalar_one_or_none()
            if row is None:
                db.add(
                    Application(
                        candidate_id=demo_cand.id,
                        job_id=primary.id,
                        status=ApplicationStatus.APPLIED,
                        applied_at=now,
                        notes="Investor demo — recruiter batch inbox",
                        auto_applied=False,
                    )
                )
                created += 1
            elif row.status != ApplicationStatus.APPLIED:
                row.status = ApplicationStatus.APPLIED
                row.applied_at = row.applied_at or now
                reset += 1
    db.flush()
    return {"company": company, "reset_to_applied": reset, "created": created}


def run_investor_demo_seed(
    db: Session,
    *,
    email: str,
    password: str,
    reset_password: bool = False,
    recompute_live_scores: bool = True,
    seed_auto_apply: bool = True,
) -> dict[str, Any]:
    """Seed all investor demo entities; safe to call multiple times."""
    user = upsert_demo_user(db, email=email, password=password, reset_password=reset_password)
    candidate = upsert_demo_candidate(db, user)
    jobs = upsert_demo_jobs(db)
    primary_job = jobs[0]
    matches = upsert_demo_matches(db, candidate, jobs)
    if recompute_live_scores:
        find_top_matches(db, candidate, limit=len(DEMO_JOBS) + 2, min_score=40.0, persist=True)
        matches = upsert_demo_matches(db, candidate, jobs)
    application = upsert_demo_application(db, candidate, primary_job)
    interview = upsert_demo_interview(db, user, application, primary_job)
    if seed_auto_apply:
        upsert_demo_auto_apply(db, candidate)
    return {
        "user_id": user.id,
        "candidate_id": candidate.id,
        "job_ids": [j.id for j in jobs],
        "match_count": len(matches),
        "application_id": application.id,
        "interview_id": interview.id,
        "primary_job_title": primary_job.title,
    }
