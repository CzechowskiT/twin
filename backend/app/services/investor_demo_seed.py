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
from app.services.placement_verification import PLACEMENT_VERIFIED, record_placement_event

DEMO_BOARD = "pracuj"
DEMO_JOB_PREFIX = "investor-demo-"
# Primary pracuj investor-demo job used for live apply on /demo (founder walkthrough).
DEMO_APPLY_JOB_EXTERNAL_ID = f"{DEMO_JOB_PREFIX}python-lead"
DEFAULT_DEMO_EMAIL = "demo@twin.career"
DEMO_RECRUITER_COMPANY = "Nova Hiring PL"
DEMO_RECRUITER_EMAIL_DOMAIN = "twin.career"
# Synthetic inbox-only accounts — not for login; recruiter demo queue only.
_DEMO_RECRUITER_PLACEHOLDER_PASSWORD = "synthetic-recruiter-demo-inbox-only"

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

RECRUITER_DEMO_QUEUE_SPECS: list[dict[str, object]] = [
    {
        "key": "alex",
        "use_main_demo_user": True,
        "name": "Alex Kowalski (demo)",
        "skills": ["python", "fastapi", "postgresql", "celery", "redis", "docker", "pytest"],
        "preferred_job_titles": ["Senior Python Developer", "Staff Backend Engineer"],
        "experience_years": 8,
        "desired_salary": 28000,
        "location": "Warsaw",
        "cv_text": CV_TEXT,
        "match_score": 96.0,
        "expected_label": "excellent",
        "status": ApplicationStatus.INTERVIEW,
        "notes": "Investor demo — recruiter batch inbox (accepted for interview)",
    },
    {
        "key": "marta",
        "email": f"marta-nova-demo@{DEMO_RECRUITER_EMAIL_DOMAIN}",
        "name": "Marta Nowak (demo)",
        "skills": ["python", "fastapi", "postgresql", "docker", "pytest", "sqlalchemy"],
        "preferred_job_titles": ["Senior Python Developer", "Backend Engineer"],
        "experience_years": 6,
        "desired_salary": None,
        "location": "Warsaw",
        "cv_text": (
            "Marta Nowak — Backend Engineer\n"
            "6 years Python/FastAPI; PostgreSQL and Docker in production.\n"
            "Salary expectations not listed on profile (verify in screen)."
        ),
        "match_score": 74.0,
        "expected_label": "good",
        "status": ApplicationStatus.APPLIED,
        "notes": "Investor demo — recruiter batch inbox (salary missing)",
    },
    {
        "key": "piotr",
        "email": f"piotr-nova-demo@{DEMO_RECRUITER_EMAIL_DOMAIN}",
        "name": "Piotr Zieliński (demo)",
        "skills": ["python", "django", "postgresql", "javascript"],
        "preferred_job_titles": ["Python Developer"],
        "experience_years": 4,
        "desired_salary": 25000,
        "location": "Kraków",
        "cv_text": (
            "Piotr Zieliński — Python Developer\n"
            "4 years Django/PostgreSQL; limited FastAPI/Celery exposure."
        ),
        "match_score": 52.0,
        "expected_label": "possible",
        "status": ApplicationStatus.APPLIED,
        "notes": "Investor demo — recruiter batch inbox (seniority gaps)",
    },
    {
        "key": "ewa",
        "email": f"ewa-nova-demo@{DEMO_RECRUITER_EMAIL_DOMAIN}",
        "name": "Ewa Wiśniewska (demo)",
        "skills": [],
        "preferred_job_titles": [],
        "experience_years": 2,
        "desired_salary": None,
        "location": "",
        "cv_text": "",
        "match_score": 32.0,
        "expected_label": "weak",
        "status": ApplicationStatus.APPLIED,
        "notes": "Investor demo — recruiter batch inbox (incomplete profile)",
    },
    {
        "key": "jan",
        "email": f"jan-nova-demo@{DEMO_RECRUITER_EMAIL_DOMAIN}",
        "name": "Jan Kaczor (demo)",
        "skills": ["python", "fastapi", "redis"],
        "preferred_job_titles": ["Python Developer"],
        "experience_years": 5,
        "desired_salary": 30000,
        "location": "Warsaw",
        "cv_text": "Jan Kaczor — Python backend; solid overlap but declined in prior demo.",
        "match_score": 68.0,
        "expected_label": "good",
        "status": ApplicationStatus.REJECTED,
        "recruiter_feedback": "Not senior enough for this quarter — demo decline row",
        "notes": "Investor demo — recruiter batch inbox (declined)",
    },
]

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
    if recent is not None and int(recent.total_applications_failed or 0) > 0:
        sweep_started = now - timedelta(hours=8)
        sweep_finished = now - timedelta(hours=7, minutes=55)
        demo_stats = {
            "demo": True,
            "source": "seed-investor-demo",
            "total_applications_skipped": 0,
            "boards": {
                "pracuj.pl": {"submitted": 2, "failed": 0, "skipped": 0},
            },
        }
        recent.started_at = sweep_started
        recent.finished_at = sweep_finished
        recent.total_users_processed = 1
        recent.total_applications_submitted = max(int(recent.total_applications_submitted or 0), 2)
        recent.total_applications_failed = 0
        recent.stats_json = json.dumps(demo_stats)
    elif recent is None or stale:
        sweep_started = now - timedelta(hours=8)
        sweep_finished = now - timedelta(hours=7, minutes=55)
        demo_stats = {
            "demo": True,
            "source": "seed-investor-demo",
            "total_applications_skipped": 0,
            "boards": {
                "pracuj.pl": {"submitted": 2, "failed": 0, "skipped": 0},
            },
        }
        run = AutoApplyRun(
            started_at=sweep_started,
            finished_at=sweep_finished,
            total_users_processed=1,
            total_applications_submitted=2,
            total_applications_failed=0,
            stats_json=json.dumps(demo_stats),
        )
        db.add(run)


def _is_recruiter_demo_application(app: Application, job: Job) -> bool:
    ext = (job.external_id or "").strip()
    if ext.startswith(DEMO_JOB_PREFIX):
        return True
    notes = (app.notes or "").lower()
    return "demo" in notes or "investor demo" in notes


def canonical_recruiter_demo_names() -> frozenset[str]:
    """Display names for the fixed Nova Hiring PL recruiter demo queue."""
    return frozenset(str(spec["name"]) for spec in RECRUITER_DEMO_QUEUE_SPECS)


def _is_synthetic_recruiter_demo_user(email: str) -> bool:
    """True for @twin.career accounts (demo/inbox-only — not external pilot emails)."""
    return email.strip().lower().endswith(f"@{DEMO_RECRUITER_EMAIL_DOMAIN}")


def _should_prune_non_canonical_demo_row(
    app: Application,
    job: Job,
    user: User,
) -> bool:
    """Nova Hiring PL demo scope only — never prune rows for external pilot emails on scraped jobs."""
    ext = (job.external_id or "").strip()
    is_demo_app = _is_recruiter_demo_application(app, job)
    is_synthetic = _is_synthetic_recruiter_demo_user(user.email)
    if ext.startswith(DEMO_JOB_PREFIX):
        return is_synthetic or is_demo_app
    return is_synthetic and is_demo_app


def prune_non_canonical_recruiter_demo_rows(
    db: Session,
    *,
    company: str = DEMO_RECRUITER_COMPANY,
) -> dict[str, int | list[str]]:
    """Drop Nova Hiring PL inbox rows outside the canonical 5 demo names (synthetic only)."""
    if company != DEMO_RECRUITER_COMPANY:
        return {"pruned": 0, "removed_names": []}

    canonical = canonical_recruiter_demo_names()
    removed_names: list[str] = []
    pruned = 0
    job_ids = list(
        db.execute(select(Job.id).where(Job.company == company)).scalars()
    )
    if not job_ids:
        return {"pruned": 0, "removed_names": []}

    rows = (
        db.query(Application, Job, Candidate, User)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(User, Candidate.user_id == User.id)
        .filter(Application.job_id.in_(job_ids))
        .all()
    )
    for app, job, cand, user in rows:
        name = (cand.name or "").strip()
        if name in canonical:
            continue
        if not _should_prune_non_canonical_demo_row(app, job, user):
            continue
        match_row = db.execute(
            select(JobMatch).where(
                JobMatch.candidate_id == cand.id,
                JobMatch.job_id == job.id,
            )
        ).scalar_one_or_none()
        if match_row is not None:
            db.delete(match_row)
        db.delete(app)
        pruned += 1
        if name and name not in removed_names:
            removed_names.append(name)
    db.flush()
    return {"pruned": pruned, "removed_names": removed_names}


def _upsert_recruiter_demo_user(db: Session, *, email: str) -> User:
    """Synthetic recruiter-demo user — inbox seed only, not for candidate login."""
    now = _now()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            hashed_password=hash_password(_DEMO_RECRUITER_PLACEHOLDER_PASSWORD),
            is_active=True,
        )
        db.add(user)
    user.gdpr_consent_at = user.gdpr_consent_at or now
    user.terms_of_service_accepted_at = user.terms_of_service_accepted_at or now
    user.job_data_processing_consent_at = user.job_data_processing_consent_at or now
    user.ai_matching_consent_at = user.ai_matching_consent_at or now
    db.flush()
    return user


def _upsert_recruiter_demo_candidate(db: Session, user: User, spec: dict[str, object]) -> Candidate:
    """Upsert one Nova Hiring PL recruiter-demo candidate profile."""
    now = _now()
    cand = db.execute(select(Candidate).where(Candidate.user_id == user.id)).scalar_one_or_none()
    if cand is None:
        cand = Candidate(user_id=user.id, name=str(spec["name"]))
        db.add(cand)
    cand.name = str(spec["name"])
    skills = spec.get("skills") or []
    titles = spec.get("preferred_job_titles") or []
    cand.skills = json.dumps(list(skills))
    cand.preferred_job_titles = json.dumps(list(titles))
    cand.experience_years = int(spec.get("experience_years") or 0)
    desired = spec.get("desired_salary")
    cand.desired_salary = int(desired) if desired is not None else None
    cand.location = str(spec.get("location") or "")
    cv_text = str(spec.get("cv_text") or "")
    cand.cv_text = cv_text or None
    cand.cv_filename = "investor-demo-recruiter-cv.txt" if cv_text else None
    cand.cv_uploaded_at = now if cv_text else None
    db.flush()
    return cand


def upsert_recruiter_demo_queue(
    db: Session,
    *,
    company: str = DEMO_RECRUITER_COMPANY,
) -> dict[str, int | str | list[str]]:
    """Idempotent Nova Hiring PL recruiter inbox queue with varied match levels."""
    now = _now()
    upsert_demo_jobs(db)
    primary = db.execute(
        select(Job).where(Job.external_id == DEMO_APPLY_JOB_EXTERNAL_ID)
    ).scalar_one_or_none()
    if primary is None or primary.company != company:
        jobs = list(
            db.execute(
                select(Job).where(Job.company == company, Job.is_validated.is_(True)).order_by(Job.id)
            ).scalars()
        )
        primary = jobs[0] if jobs else None
    if primary is None:
        return {"company": company, "created": 0, "updated": 0, "candidate_keys": []}

    created = 0
    updated = 0
    keys: list[str] = []
    for spec in RECRUITER_DEMO_QUEUE_SPECS:
        key = str(spec["key"])
        keys.append(key)
        if spec.get("use_main_demo_user"):
            user = db.execute(select(User).where(User.email == demo_email_from_env())).scalar_one_or_none()
            if user is None:
                continue
        else:
            email = str(spec.get("email") or f"{key}-nova-demo@{DEMO_RECRUITER_EMAIL_DOMAIN}")
            user = _upsert_recruiter_demo_user(db, email=email.lower())
        cand = _upsert_recruiter_demo_candidate(db, user, spec)
        score = float(spec.get("match_score", 70.0))
        match_row = db.execute(
            select(JobMatch).where(
                JobMatch.candidate_id == cand.id,
                JobMatch.job_id == primary.id,
            )
        ).scalar_one_or_none()
        if match_row is None:
            db.add(JobMatch(candidate_id=cand.id, job_id=primary.id, score=score))
            created += 1
        else:
            match_row.score = score
            updated += 1

        target_status = spec["status"]
        if not isinstance(target_status, ApplicationStatus):
            target_status = ApplicationStatus(str(target_status))
        app = db.execute(
            select(Application).where(
                Application.candidate_id == cand.id,
                Application.job_id == primary.id,
            )
        ).scalar_one_or_none()
        if app is None:
            app = Application(
                candidate_id=cand.id,
                job_id=primary.id,
                status=target_status,
                applied_at=now,
                notes=str(spec.get("notes") or "Investor demo — recruiter batch inbox"),
                auto_applied=False,
            )
            db.add(app)
            created += 1
        else:
            if app.status != target_status:
                updated += 1
            app.status = target_status
            app.applied_at = app.applied_at or now
            app.notes = str(spec.get("notes") or app.notes or "Investor demo — recruiter batch inbox")
            app.auto_applied = False
            feedback = str(spec.get("recruiter_feedback") or "").strip()
            if feedback and target_status == ApplicationStatus.REJECTED:
                app.recruiter_feedback_raw = feedback[:2000]
            elif target_status != ApplicationStatus.REJECTED:
                app.recruiter_feedback_raw = None
    db.flush()
    return {
        "company": company,
        "created": created,
        "updated": updated,
        "candidate_keys": keys,
        "queue_size": len(keys),
    }


def ensure_recruiter_inbox_demo(
    db: Session,
    *,
    company: str = DEMO_RECRUITER_COMPANY,
) -> dict[str, int | str | list[str]]:
    """Restore canonical recruiter demo queue (idempotent; safe on prod)."""
    summary = upsert_recruiter_demo_queue(db, company=company)
    pruned_summary = prune_non_canonical_recruiter_demo_rows(db, company=company)
    created = int(summary.get("created", 0))
    updated = int(summary.get("updated", 0))
    return {
        "company": company,
        "reset_to_applied": 0,
        "created": created,
        "updated": updated,
        "queue_size": int(summary.get("queue_size", 0)),
        "pruned": int(pruned_summary.get("pruned", 0)),
        "removed_names": list(pruned_summary.get("removed_names") or []),
    }


def ensure_demo_placement_verified(db: Session, *, application_id: int | None = None) -> dict[str, int | bool]:
    """Mark one investor-demo application as placement verified (idempotent; bumps mvp-stats)."""
    from app.database.models import PlacementEvent

    app: Application | None = None
    if application_id is not None:
        app = db.get(Application, application_id)
    else:
        demo_user = db.execute(select(User).where(User.email == demo_email_from_env())).scalar_one_or_none()
        if demo_user is not None:
            demo_cand = db.execute(
                select(Candidate).where(Candidate.user_id == demo_user.id)
            ).scalar_one_or_none()
            primary = db.execute(
                select(Job).where(Job.external_id == DEMO_APPLY_JOB_EXTERNAL_ID)
            ).scalar_one_or_none()
            if demo_cand is not None and primary is not None:
                app = db.execute(
                    select(Application).where(
                        Application.candidate_id == demo_cand.id,
                        Application.job_id == primary.id,
                    )
                ).scalar_one_or_none()
    if app is None:
        return {"application_id": 0, "verified": False, "already_verified": False}

    if app.placement_verified_at is not None and app.placement_state == PLACEMENT_VERIFIED:
        return {"application_id": app.id, "verified": True, "already_verified": True}

    owner_user_id = db.execute(
        select(Candidate.user_id).where(Candidate.id == app.candidate_id)
    ).scalar_one_or_none()
    event_count = (
        db.query(PlacementEvent).filter(PlacementEvent.application_id == app.id).count()
    )
    if event_count < 1:
        record_placement_event(
            db,
            application_id=app.id,
            event_type="placement.declared",
            actor="candidate",
            detail={"source": "demo_seed"},
            owner_user_id=owner_user_id,
        )
        app.placement_state = "declared"
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.verified",
        actor="system",
        detail={"method": "demo_seed"},
        owner_user_id=owner_user_id,
    )
    now = _now()
    app.placement_verified_at = now
    app.placement_state = PLACEMENT_VERIFIED
    app.status = ApplicationStatus.HIRED
    db.add(app)
    db.flush()
    return {"application_id": app.id, "verified": True, "already_verified": False}


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
