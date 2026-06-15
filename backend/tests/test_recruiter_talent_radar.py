from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.recruiter_talent_radar import build_recruiter_talent_radar
from app.services.recruiter_match_explanations import INBOX_FORBIDDEN_PII_KEYS
from tests.test_auth_integration import _sqlite_session


def test_talent_radar_returns_explainable_suggestions() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="radar@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Jan Radar",
            skills='["Python", "FastAPI"]',
            preferred_job_titles='["Backend Developer"]',
            location="Warsaw",
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="tr-j1",
            title="Python Developer",
            company="Acme Corp",
            url="https://example.com/j",
            location="Warsaw",
            requirements="Python FastAPI",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
            )
        )
        db.commit()
        out = build_recruiter_talent_radar(db, company_slug="acme-corp", locale="en")
        assert out["summary"]["scope"] == "internal_workspace"
        assert out["summary"]["external_sourcing_connected"] is False
        assert out["summary"]["pilot"] is True
        assert len(out["suggestions"]) >= 1
        row = out["suggestions"][0]
        assert row["why_surfaced"]
        assert row["why_now"]
        assert row["risks"]
        assert row["human_decision_required"] is True
        blob = str(row).lower()
        for forbidden in INBOX_FORBIDDEN_PII_KEYS:
            assert forbidden not in blob
    finally:
        db.close()


def test_talent_radar_polish_disclaimer() -> None:
    db = _sqlite_session()
    try:
        out = build_recruiter_talent_radar(db, company_slug="nova-hiring-pl", locale="pl")
        assert "rekruter" in out["disclaimer"].lower()
    finally:
        db.close()
