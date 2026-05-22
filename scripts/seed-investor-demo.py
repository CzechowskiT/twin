#!/usr/bin/env python3
"""Idempotent investor demo seed: candidate account, jobs, applications, interview, placement events.

Run from repository root (requires DATABASE_URL or default local Postgres):

  python3 scripts/seed-investor-demo.py
  python3 scripts/seed-investor-demo.py --print-credentials

Optional env:
  INVESTOR_DEMO_EMAIL (default: investor-demo@twin.local)
  INVESTOR_DEMO_PASSWORD (default: InvestorDemo2026!)
  INVESTOR_DEMO_COMPANY (default: Twin Demo Corp)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password  # noqa: E402
from app.database.connection import get_session  # noqa: E402
from app.database.models import (  # noqa: E402
    Application,
    ApplicationStatus,
    AutoApplyConsent,
    AutoApplyRun,
    Candidate,
    Job,
    JobMatch,
    PlacementEvent,
    RecruiterCompanyToken,
    ScheduledInterview,
    User,
)
from app.services.placement_verification import (  # noqa: E402
    PLACEMENT_DECLARED,
    PLACEMENT_VERIFIED,
    record_placement_event,
)
from app.services.recruiter_company_auth import mint_recruiter_company_token  # noqa: E402
from app.utils.slug import slugify_company  # noqa: E402

DEFAULT_EMAIL = "investor-demo@twin.local"
DEFAULT_PASSWORD = "InvestorDemo2026!"
DEFAULT_COMPANY = "Twin Demo Corp"
DEMO_CV_TEXT = (
    "Senior Python engineer — FastAPI, PostgreSQL, Celery, Playwright scrapers. "
    "Warsaw / hybrid. Seeking product-minded teams building autonomous hiring."
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _upsert_user(db, *, email: str, password: str) -> User:
    row = db.query(User).filter(User.email == email).first()
    now = _now()
    if row:
        row.hashed_password = hash_password(password)
        row.is_active = True
        row.gdpr_consent_at = row.gdpr_consent_at or now
        row.onboarding_completed_at = row.onboarding_completed_at or now
        row.email_verified_at = row.email_verified_at or now
        db.add(row)
        db.flush()
        return row
    user = User(
        email=email,
        hashed_password=hash_password(password),
        gdpr_consent_at=now,
        is_active=True,
        onboarding_completed_at=now,
        email_verified_at=now,
    )
    db.add(user)
    db.flush()
    return user


def _upsert_candidate(db, *, user: User) -> Candidate:
    row = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    now = _now()
    if row:
        row.name = row.name or "Alex Demo"
        row.cv_text = DEMO_CV_TEXT
        row.cv_filename = row.cv_filename or "investor-demo-cv.pdf"
        row.cv_uploaded_at = row.cv_uploaded_at or now
        row.skills = json.dumps(["python", "fastapi", "postgresql", "celery"])
        row.location = row.location or "Warszawa"
        db.add(row)
        db.flush()
        return row
    cand = Candidate(
        user_id=user.id,
        name="Alex Demo",
        skills=json.dumps(["python", "fastapi", "postgresql", "celery"]),
        experience_years=6,
        location="Warszawa",
        cv_text=DEMO_CV_TEXT,
        cv_filename="investor-demo-cv.pdf",
        cv_uploaded_at=now,
        cv_processing_consent_at=now,
    )
    db.add(cand)
    db.flush()
    return cand


def _upsert_jobs(db, *, company: str) -> list[Job]:
    specs = [
        ("demo-python-1", "Python Developer", "pracuj.pl"),
        ("demo-python-2", "Backend Engineer", "rocketjobs.pl"),
        ("demo-pm-1", "Product Manager", "pracuj.pl"),
    ]
    out: list[Job] = []
    for ext, title, board in specs:
        row = (
            db.query(Job)
            .filter(Job.job_board == board, Job.external_id == ext)
            .first()
        )
        if not row:
            row = Job(
                job_board=board,
                external_id=ext,
                title=title,
                company=company,
                location="Warszawa",
                salary_min=18_000,
                salary_max=24_000,
                requirements="Python, SQL, async APIs",
                description=f"{title} at {company} — investor demo listing.",
                url=f"https://example.com/jobs/{ext}",
                is_validated=True,
                scraped_at=_now(),
            )
            db.add(row)
            db.flush()
        out.append(row)
    return out


def _upsert_application(
    db,
    *,
    candidate: Candidate,
    job: Job,
    status: ApplicationStatus,
    auto_applied: bool,
    placement_state: str = "none",
) -> Application:
    row = (
        db.query(Application)
        .filter(Application.candidate_id == candidate.id, Application.job_id == job.id)
        .first()
    )
    now = _now()
    if row:
        row.status = status
        row.auto_applied = auto_applied
        row.application_method = "auto_apply_nightly" if auto_applied else "manual"
        row.placement_state = placement_state
        row.applied_at = row.applied_at or now
        row.updated_at = now
        db.add(row)
        db.flush()
        return row
    app = Application(
        candidate_id=candidate.id,
        job_id=job.id,
        status=status,
        applied_at=now,
        updated_at=now,
        auto_applied=auto_applied,
        application_method="auto_apply_nightly" if auto_applied else "manual",
        placement_state=placement_state,
    )
    db.add(app)
    db.flush()
    return row


def _seed_placement_timeline(db, *, app: Application, user_id: int) -> None:
    existing = db.query(PlacementEvent).filter(PlacementEvent.application_id == app.id).count()
    if existing >= 2:
        return
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.declared",
        actor="candidate",
        detail={"source": "investor_demo_seed"},
        owner_user_id=user_id,
    )
    app.placement_state = PLACEMENT_DECLARED
    app.placement_reported_at = _now()
    db.add(app)
    db.flush()
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.verified",
        actor="system",
        detail={"method": "demo_seed"},
        owner_user_id=user_id,
    )
    app.placement_state = PLACEMENT_VERIFIED
    app.placement_verified_at = _now()
    app.status = ApplicationStatus.HIRED
    db.add(app)


def _seed_auto_apply(db, *, candidate: Candidate) -> None:
    now = _now()
    consent = (
        db.query(AutoApplyConsent)
        .filter(AutoApplyConsent.candidate_id == candidate.id)
        .first()
    )
    if not consent:
        consent = AutoApplyConsent(
            candidate_id=candidate.id,
            is_active=True,
            consent_given_at=now,
            min_score_threshold=85.0,
            daily_limit=5,
            total_applications_submitted=1,
            last_run_at=now - timedelta(hours=6),
        )
        db.add(consent)
    else:
        consent.is_active = True
        consent.consent_given_at = consent.consent_given_at or now
        consent.last_run_at = now - timedelta(hours=6)
        consent.total_applications_submitted = max(1, int(consent.total_applications_submitted or 0))
        db.add(consent)

    run = (
        db.query(AutoApplyRun)
        .order_by(AutoApplyRun.started_at.desc())
        .first()
    )
    if not run or (now - run.started_at).total_seconds() > 86400:
        finished = now - timedelta(minutes=4)
        db.add(
            AutoApplyRun(
                started_at=finished - timedelta(minutes=12),
                finished_at=finished,
                total_users_processed=1,
                total_applications_submitted=1,
                total_applications_failed=0,
                stats_json=json.dumps({"source": "investor_demo_seed"}),
            ),
        )


def _seed_interview(db, *, user: User, app: Application, job: Job) -> None:
    start = _now() + timedelta(days=3)
    end = start + timedelta(minutes=45)
    row = (
        db.query(ScheduledInterview)
        .filter(ScheduledInterview.user_id == user.id, ScheduledInterview.application_id == app.id)
        .first()
    )
    if row:
        row.interview_start = start
        row.interview_end = end
        row.status = "scheduled"
        db.add(row)
        return
    db.add(
        ScheduledInterview(
            user_id=user.id,
            application_id=app.id,
            company_name=job.company,
            job_title=job.title,
            interview_start=start,
            interview_end=end,
            timezone="Europe/Warsaw",
            interview_type="video",
            status="scheduled",
            meeting_link="https://meet.google.com/demo-investor-interview",
        ),
    )


def _seed_matches(db, *, candidate: Candidate, jobs: list[Job]) -> None:
    for job in jobs:
        exists = (
            db.query(JobMatch)
            .filter(JobMatch.candidate_id == candidate.id, JobMatch.job_id == job.id)
            .first()
        )
        if exists:
            continue
        db.add(
            JobMatch(
                candidate_id=candidate.id,
                job_id=job.id,
                score=92.5,
                match_reason="Investor demo — high bar match",
            ),
        )


def run_seed(*, print_credentials: bool) -> dict[str, str]:
    email = (os.environ.get("INVESTOR_DEMO_EMAIL") or DEFAULT_EMAIL).strip().lower()
    password = os.environ.get("INVESTOR_DEMO_PASSWORD") or DEFAULT_PASSWORD
    company = os.environ.get("INVESTOR_DEMO_COMPANY") or DEFAULT_COMPANY
    slug = slugify_company(company)

    with get_session() as db:
        user = _upsert_user(db, email=email, password=password)
        candidate = _upsert_candidate(db, user=user)
        jobs = _upsert_jobs(db, company=company)
        _seed_matches(db, candidate=candidate, jobs=jobs)

        applied_app = _upsert_application(
            db,
            candidate=candidate,
            job=jobs[0],
            status=ApplicationStatus.APPLIED,
            auto_applied=True,
        )
        _upsert_application(
            db,
            candidate=candidate,
            job=jobs[1],
            status=ApplicationStatus.INTERVIEW,
            auto_applied=False,
        )
        hired_app = _upsert_application(
            db,
            candidate=candidate,
            job=jobs[2],
            status=ApplicationStatus.HIRED,
            auto_applied=False,
            placement_state=PLACEMENT_VERIFIED,
        )
        _seed_placement_timeline(db, app=hired_app, user_id=user.id)
        _seed_interview(db, user=user, app=applied_app, job=jobs[0])
        _seed_auto_apply(db, candidate=candidate)

        db.commit()

        raw_token: str | None = None
        token_row = (
            db.query(RecruiterCompanyToken)
            .filter(
                RecruiterCompanyToken.company_slug == slug,
                RecruiterCompanyToken.revoked_at.is_(None),
            )
            .first()
        )
        if not token_row:
            token_row, raw_token = mint_recruiter_company_token(
                db,
                company_slug=slug,
                label="Investor demo inbox",
            )

    out = {
        "email": email,
        "password": password,
        "company": company,
        "company_slug": slug,
        "recruiter_inbox_url": f"/recruiter/inbox?company_slug={slug}",
        "recruiter_token_id": str(token_row.id) if token_row else "",
    }
    if print_credentials and raw_token:
        out["recruiter_token"] = raw_token
    elif print_credentials and not raw_token:
        out["recruiter_token_note"] = (
            "Token already exists for this company — revoke in admin and re-run with --print-credentials"
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed investor demo data (idempotent).")
    parser.add_argument(
        "--print-credentials",
        action="store_true",
        help="Print one-time recruiter inbox token (minted or re-minted each run).",
    )
    args = parser.parse_args()
    try:
        result = run_seed(print_credentials=args.print_credentials)
    except Exception as exc:
        print(f"seed-investor-demo failed: {exc}", file=sys.stderr)
        return 1
    print("Investor demo seed OK:")
    for key, val in result.items():
        if key == "recruiter_token":
            print(f"  {key}: {val}")
        else:
            print(f"  {key}: {val}")
    print("  login: /login → candidate dashboard → applications / calendar / auto-apply strip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
