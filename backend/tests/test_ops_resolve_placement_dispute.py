from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.placement_verification import PLACEMENT_DECLARED, PLACEMENT_DISPUTED, ops_resolve_placement_dispute
from tests.test_auth_integration import _sqlite_session


def test_ops_resolve_verified() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="resolve@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-1",
            title="Dev",
            company="Co",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            placement_state=PLACEMENT_DISPUTED,
        )
        db.add(app_row)
        db.commit()
        out = ops_resolve_placement_dispute(db, application_id=app_row.id, resolution="verified")
        assert out.placement_state == "verified"
        assert out.placement_verified_at is not None
    finally:
        db.close()


def test_ops_resolve_dismissed() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="dismiss@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="r-2",
            title="Dev",
            company="Co",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            placement_state=PLACEMENT_DISPUTED,
        )
        db.add(app_row)
        db.commit()
        out = ops_resolve_placement_dispute(db, application_id=app_row.id, resolution="dismissed")
        assert out.placement_state == PLACEMENT_DECLARED
    finally:
        db.close()
