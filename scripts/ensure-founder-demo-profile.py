#!/usr/bin/env python3
"""Supplement founder demo account without password reset or Alex Kowalski persona.

Safe for production: only fills missing consents/CV; never overwrites existing name or cv_text.
Always idempotently upserts investor-demo jobs (shared DB rows).

  export DEMO_USER_EMAIL=czechowski@protonmail.ch   # optional
  # Local: use Postgres public URL (Railway → Postgres → Connect), not internal DATABASE_URL:
  export DATABASE_URL='postgresql://…'   # DATABASE_PUBLIC_URL from Railway Postgres service
  python3 scripts/ensure-founder-demo-profile.py

  python3 scripts/ensure-founder-demo-profile.py --dry-run
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

from sqlalchemy import select  # noqa: E402

from app.database.connection import get_session  # noqa: E402
from app.database.models import (  # noqa: E402
    Application,
    ApplicationStatus,
    AutoApplyConsent,
    Candidate,
    Job,
    JobMatch,
    ScheduledInterview,
    User,
)
from app.services.investor_demo_seed import (  # noqa: E402
    DEMO_APPLY_JOB_EXTERNAL_ID,
    DEMO_BOARD,
    DEMO_JOBS,
    upsert_demo_jobs,
)

DEFAULT_FOUNDER_EMAIL = "czechowski@protonmail.ch"
DEMO_PERSONA_NAME = "Alex Kowalski (demo)"
MINIMAL_CV_PLACEHOLDER = """\
TWIN founder account — CV placeholder for /demo auto-apply.
Replace with your real CV in Profile when ready.
"""

DEFAULT_SKILLS = ["python", "fastapi", "postgresql", "celery", "redis"]
DEFAULT_TITLES = ["Senior Python Developer", "Staff Backend Engineer", "Platform Engineer"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _email() -> str:
    return (
        os.environ.get("FOUNDER_DEMO_EMAIL")
        or os.environ.get("DEMO_USER_EMAIL")
        or DEFAULT_FOUNDER_EMAIL
    ).strip().lower()


def _has_cv(cand: Candidate) -> bool:
    if cand.cv_text and str(cand.cv_text).strip():
        return True
    if cand.resume_path and str(cand.resume_path).strip():
        return True
    return bool(cand.cv_filename and str(cand.cv_filename).strip())


def ensure_user_consents(user: User, *, dry_run: bool) -> list[str]:
    now = _now()
    updates: list[str] = []
    fields = (
        ("gdpr_consent_at", user.gdpr_consent_at),
        ("terms_of_service_accepted_at", user.terms_of_service_accepted_at),
        ("job_data_processing_consent_at", user.job_data_processing_consent_at),
        ("ai_matching_consent_at", user.ai_matching_consent_at),
        ("email_verified_at", user.email_verified_at),
        ("onboarding_completed_at", user.onboarding_completed_at),
    )
    for attr, current in fields:
        if current is None:
            updates.append(attr)
            if not dry_run:
                setattr(user, attr, now)
    return updates


def ensure_candidate(db, user: User, *, dry_run: bool) -> tuple[Candidate | None, list[str]]:
    changes: list[str] = []
    cand = db.execute(select(Candidate).where(Candidate.user_id == user.id)).scalar_one_or_none()
    if cand is None:
        changes.append("candidate_created")
        if dry_run:
            return None, changes
        local = user.email.split("@")[0].replace(".", " ").title()
        cand = Candidate(user_id=user.id, name=local or "Founder")
        db.add(cand)
        db.flush()

    name = (cand.name or "").strip()
    if not name or name == DEMO_PERSONA_NAME:
        changes.append("candidate_name_set")
        if not dry_run:
            local = user.email.split("@")[0].replace(".", " ").title()
            cand.name = local or "Founder"

    if not _has_cv(cand):
        changes.append("cv_text_placeholder")
        if not dry_run:
            cand.cv_text = MINIMAL_CV_PLACEHOLDER
            cand.cv_filename = cand.cv_filename or "founder-demo-placeholder.txt"
            cand.cv_uploaded_at = cand.cv_uploaded_at or _now()

    if not cand.skills:
        changes.append("skills_default")
        if not dry_run:
            cand.skills = json.dumps(DEFAULT_SKILLS)
    if not cand.preferred_job_titles:
        changes.append("preferred_titles_default")
        if not dry_run:
            cand.preferred_job_titles = json.dumps(DEFAULT_TITLES)
    if cand.experience_years is None:
        changes.append("experience_years_default")
        if not dry_run:
            cand.experience_years = 5
    if not cand.location:
        changes.append("location_default")
        if not dry_run:
            cand.location = "Warsaw"

    return cand, changes


def ensure_matches(db, candidate: Candidate, jobs: list[Job], *, dry_run: bool) -> int:
    by_ext = {j.external_id: j for j in jobs}
    added = 0
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
            added += 1
            if not dry_run:
                db.add(JobMatch(candidate_id=candidate.id, job_id=job.id, score=score))
        elif row.score is None or float(row.score) < score:
            if not dry_run:
                row.score = score
    if not dry_run:
        db.flush()
    return added


def ensure_primary_application(
    db, candidate: Candidate, primary: Job, *, dry_run: bool
) -> str | None:
    existing = (
        db.execute(select(Application).where(Application.candidate_id == candidate.id).limit(1))
        .scalar_one_or_none()
    )
    if existing is not None:
        return "application_exists"
    if dry_run:
        return "application_would_create"
    now = _now()
    app = Application(
        candidate_id=candidate.id,
        job_id=primary.id,
        status=ApplicationStatus.APPLIED,
        applied_at=now,
        notes="Founder demo — applied row for /demo snapshot.",
        auto_applied=False,
    )
    db.add(app)
    db.flush()
    return f"application_created:{app.id}"


def ensure_interview(
    db, user: User, application: Application, job: Job, *, dry_run: bool
) -> str | None:
    row = (
        db.execute(
            select(ScheduledInterview).where(ScheduledInterview.user_id == user.id).limit(1)
        )
        .scalar_one_or_none()
    )
    if row is not None:
        return "interview_exists"
    if dry_run:
        return "interview_would_create"
    start = _now() + timedelta(days=3)
    end = start + timedelta(hours=1)
    interview = ScheduledInterview(
        user_id=user.id,
        application_id=application.id,
        company_name=job.company,
        job_title=job.title,
        interview_start=start,
        interview_end=end,
        timezone="Europe/Warsaw",
        meeting_link="https://meet.google.com/founder-demo-interview",
        interview_type="video",
        status="scheduled",
        calendar_provider="google",
    )
    db.add(interview)
    db.flush()
    return f"interview_created:{interview.id}"


def ensure_auto_apply_consent(db, candidate: Candidate, *, dry_run: bool) -> str:
    consent = db.execute(
        select(AutoApplyConsent).where(AutoApplyConsent.candidate_id == candidate.id)
    ).scalar_one_or_none()
    if consent is not None and consent.is_active:
        return "auto_apply_consent_exists"
    if dry_run:
        return "auto_apply_consent_would_create"
    now = _now()
    if consent is None:
        consent = AutoApplyConsent(candidate_id=candidate.id)
        db.add(consent)
    consent.is_active = True
    consent.consent_given_at = consent.consent_given_at or now
    consent.min_score_threshold = consent.min_score_threshold or 85.0
    consent.daily_limit = consent.daily_limit or 5
    db.flush()
    return "auto_apply_consent_ensured"


def main() -> int:
    parser = argparse.ArgumentParser(description="Ensure founder demo profile (no password reset).")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing.")
    args = parser.parse_args()
    email = _email()

    summary: dict[str, object] = {"email": email, "dry_run": args.dry_run}

    with get_session() as db:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            print(f"No user for {email}. Register on prod first, then re-run.", file=sys.stderr)
            return 1

        summary["user_id"] = user.id
        user_changes = ensure_user_consents(user, dry_run=args.dry_run)
        summary["user_consent_fields_set"] = user_changes

        jobs = upsert_demo_jobs(db) if not args.dry_run else []
        if args.dry_run:
            summary["demo_jobs"] = f"would_upsert_{len(DEMO_JOBS)}"
        else:
            db.flush()
            summary["demo_jobs_upserted"] = len(jobs)

        cand, cand_changes = ensure_candidate(db, user, dry_run=args.dry_run)
        summary["candidate_changes"] = cand_changes

        if cand is not None and not args.dry_run:
            primary = next(
                (j for j in jobs if j.external_id == DEMO_APPLY_JOB_EXTERNAL_ID),
                jobs[0] if jobs else None,
            )
            if primary is None:
                primary = db.execute(
                    select(Job).where(
                        Job.job_board == DEMO_BOARD,
                        Job.external_id == DEMO_APPLY_JOB_EXTERNAL_ID,
                    )
                ).scalar_one_or_none()
            if primary:
                summary["matches_added_or_updated"] = ensure_matches(db, cand, jobs, dry_run=False)
                app_note = ensure_primary_application(db, cand, primary, dry_run=False)
                summary["application"] = app_note
                if app_note and app_note.startswith("application_created"):
                    app = db.execute(
                        select(Application).where(Application.candidate_id == cand.id)
                    ).scalar_one()
                    summary["interview"] = ensure_interview(db, user, app, primary, dry_run=False)
                elif app_note == "application_exists":
                    app = db.execute(
                        select(Application).where(Application.candidate_id == cand.id).limit(1)
                    ).scalar_one()
                    job = db.get(Job, app.job_id) or primary
                    summary["interview"] = ensure_interview(db, user, app, job, dry_run=False)
            summary["auto_apply"] = ensure_auto_apply_consent(db, cand, dry_run=False)

        if not args.dry_run:
            db.commit()

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
