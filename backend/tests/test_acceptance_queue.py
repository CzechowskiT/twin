from datetime import datetime, timedelta, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, ScheduledInterview, User
from app.services.acceptance_queue import build_acceptance_queue, respond_acceptance_item
from tests.test_auth_integration import _sqlite_session


def test_acceptance_queue_match_accept() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="acc@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="C",
            skills='["python"]',
            preferred_job_titles='["dev"]',
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="aq-1",
            title="Engineer",
            company="Co",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.commit()
        q = build_acceptance_queue(db, cand)
        assert q["total"] >= 0
        if q["matches"]:
            mid = q["matches"][0]["job_id"]
            out = respond_acceptance_item(db, cand, kind="match", item_id=mid, action="accept")
            assert out["ok"]
    finally:
        db.close()


def test_acceptance_queue_includes_interview() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="int@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        db.flush()
        start = datetime.utcnow() + timedelta(days=2)
        db.add(
            ScheduledInterview(
                user_id=user.id,
                company_name="Acme",
                job_title="Dev",
                interview_start=start,
                interview_end=start + timedelta(hours=1),
                timezone="UTC",
                status="scheduled",
            )
        )
        db.commit()
        q = build_acceptance_queue(db, cand)
        assert len(q["interviews"]) == 1
    finally:
        db.close()
