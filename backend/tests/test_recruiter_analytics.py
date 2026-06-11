"""Tests for recruiter analytics."""

from __future__ import annotations

from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.services.recruiter_analytics import build_recruiter_analytics
from tests.test_auth_integration import _sqlite_session


def test_build_recruiter_analytics_shape() -> None:
    db = _sqlite_session()
    try:
        user = User(email="x@y.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="A", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="a1",
            title="Eng",
            company="Nova Hiring PL",
            url="https://example.com",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED))
        db.commit()
        out = build_recruiter_analytics(db, company_slug="nova-hiring-pl")
        assert out["company_slug"] == "nova-hiring-pl"
        assert out["readiness"]["bi_live"] is False
        assert "email" not in str(out).lower()
    finally:
        db.close()
