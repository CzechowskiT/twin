from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.admin_placement_queue import build_placement_dispute_queue
from tests.test_auth_integration import _sqlite_session


def test_dispute_queue_lists_rows() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="ops-q@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="dq-1",
            title="Dev",
            company="Acme",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
                placement_state="disputed",
            )
        )
        db.commit()
        out = build_placement_dispute_queue(db)
        assert out["total"] == 1
        assert out["items"][0]["company"] == "Acme"
    finally:
        db.close()
