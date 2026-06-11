from datetime import datetime, timezone

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.recruiter_candidate_search import build_recruiter_candidate_search
from app.services.recruiter_match_explanations import INBOX_FORBIDDEN_PII_KEYS
from tests.test_auth_integration import _sqlite_session


def test_search_filters_by_name_and_company() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="search@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Maria Kowalska",
            skills='["Python"]',
            preferred_job_titles='["Developer"]',
            location="Warsaw",
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="s-j1",
            title="Python Developer",
            company="Acme Corp",
            url="https://example.com/j",
            location="Warsaw",
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
        out = build_recruiter_candidate_search(
            db,
            company_slug="acme-corp",
            name="maria",
        )
        assert out["total"] == 1
        assert out["external_sourcing_connected"] is False
        assert out["scope"] == "workspace_pool"
        assert out["items"][0]["candidate_name"] == "Maria Kowalska"
        empty = build_recruiter_candidate_search(
            db,
            company_slug="acme-corp",
            name="nobody",
        )
        assert empty["total"] == 0
    finally:
        db.close()


def test_search_respects_score_range_and_no_forbidden_pii() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="pii@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Alex",
            skills='["Python", "FastAPI"]',
            preferred_job_titles='["Python Developer"]',
            location="Krakow",
        )
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="s-j2",
            title="Senior Python Developer",
            company="Bravo Inc",
            url="https://example.com/j2",
            requirements="Python FastAPI",
            location="Krakow",
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
        out = build_recruiter_candidate_search(
            db,
            company_slug="bravo-inc",
            min_score=0,
            max_score=100,
        )
        assert out["total"] >= 1
        row = out["items"][0]
        for forbidden in INBOX_FORBIDDEN_PII_KEYS:
            assert forbidden not in row
        assert "review_card" in row
        assert row["pipeline_status"]
    finally:
        db.close()
