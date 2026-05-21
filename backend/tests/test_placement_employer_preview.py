from datetime import datetime, timedelta, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.placement_verification import (
    PLACEMENT_DECLARED,
    hash_placement_token,
    issue_employer_attestation_link,
    preview_employer_attestation,
)
from app.config import get_settings
from tests.test_auth_integration import _sqlite_session


def test_preview_employer_attestation() -> None:
    db = _sqlite_session()
    get_settings.cache_clear()
    try:
        settings = get_settings()
        user = User(
            email="prev@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="p-1",
            title="Engineer",
            company="Branded Co",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            placement_state=PLACEMENT_DECLARED,
        )
        db.add(app_row)
        db.commit()
        url, _exp, _mail = issue_employer_attestation_link(
            db, settings, user=user, application_id=app_row.id
        )
        raw = url.split("token=")[-1]
        info = preview_employer_attestation(db, raw)
        assert info is not None
        assert info["company_name"] == "Branded Co"
        assert info["job_title"] == "Engineer"
        assert info["company_slug"] == "branded-co"
        assert "/placement/employer/branded-co?" in url
    finally:
        db.close()
        get_settings.cache_clear()
