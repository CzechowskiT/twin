"""Tests for recruiter application scorecards."""

from __future__ import annotations

from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.services.recruiter_scorecards import get_recruiter_scorecard, upsert_recruiter_scorecard
from tests.test_auth_integration import _sqlite_session


def _seed_app(db) -> tuple[int, str]:
    user = User(
        email="hidden@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Secret", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    job = Job(
        job_board="pracuj",
        external_id="sc-j1",
        title="Engineer",
        company="Nova Hiring PL",
        url="https://example.com/j1",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(app_row)
    db.commit()
    return app_row.id, "nova-hiring-pl"


def test_scorecard_upsert_and_get() -> None:
    db = _sqlite_session()
    try:
        app_id, slug = _seed_app(db)
        empty = get_recruiter_scorecard(db, application_id=app_id, company_slug=slug)
        assert empty["rating"] is None
        saved = upsert_recruiter_scorecard(
            db,
            application_id=app_id,
            company_slug=slug,
            rating=4,
            note="Strong bar on system design",
        )
        assert saved["rating"] == 4
        assert "system design" in (saved["note"] or "")
        again = get_recruiter_scorecard(db, application_id=app_id, company_slug=slug)
        assert again["rating"] == 4
    finally:
        db.close()
