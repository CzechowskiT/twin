from datetime import datetime, timezone

import pytest

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.services.recruiter_scheduling import save_recruiter_manual_schedule
from tests.test_auth_integration import _sqlite_session


def test_save_manual_schedule_for_accepted_candidate() -> None:
    db = _sqlite_session()
    try:
        user = User(email="sch@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Alex", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="sch-j1",
            title="Engineer",
            company="Acme Corp",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.INTERVIEW)
        db.add(app)
        db.commit()
        out = save_recruiter_manual_schedule(
            db,
            company_slug="acme-corp",
            application_id=app.id,
            slot_date="2026-06-15",
            slot_time="14:30",
            duration_minutes=45,
            meeting_link="https://meet.example/x",
            scheduling_status="interview_scheduled",
        )
        assert out["scheduling_status"] == "interview_scheduled"
        assert out["manual_slot_at"] is not None
        assert out["manual_meeting_link"] == "https://meet.example/x"
    finally:
        db.close()


def test_scheduling_rejected_for_applied_candidate() -> None:
    db = _sqlite_session()
    try:
        user = User(email="sch2@example.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Bob", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="sch-j2",
            title="Engineer",
            company="Acme Corp",
            url="https://example.com/j2",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
        db.add(app)
        db.commit()
        with pytest.raises(ValueError, match="accepted"):
            save_recruiter_manual_schedule(
                db,
                company_slug="acme-corp",
                application_id=app.id,
                slot_date="2026-06-15",
                slot_time="14:30",
                duration_minutes=45,
                meeting_link=None,
                scheduling_status="invited",
            )
    finally:
        db.close()
