"""Matcher scan window vs large validated corpus."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, Candidate, Job, User
from app.services.matching_service import find_top_matches


@pytest.fixture
def cov_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()


def _candidate(db) -> Candidate:
    now = datetime.now(timezone.utc)
    user = User(
        email="scan@example.com",
        hashed_password="x",
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        is_active=True,
    )
    db.add(user)
    db.flush()
    candidate = Candidate(
        user_id=user.id,
        name="Scan",
        skills='["python"]',
        preferred_job_titles='["Developer"]',
        experience_years=4,
        location="Warszawa",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def _seed_jobs(db, count: int) -> None:
    now = datetime.utcnow()
    for i in range(count):
        db.add(
            Job(
                job_board="pracuj.pl",
                external_id=f"scan-{i}",
                title=f"Python Developer {i}",
                company=f"Co {i % 50}",
                url=f"https://example.com/{i}",
                is_validated=True,
                scraped_at=now - timedelta(hours=i % 48),
                description="Python REST API",
                requirements="Python",
                location="Warszawa",
            )
        )
    db.commit()


def test_find_top_matches_scans_beyond_4000_when_limit_15000(cov_db, monkeypatch) -> None:
    """With default scan limit 15k, matcher should see jobs older than the newest 4000 rows."""
    monkeypatch.setenv("MATCH_JOBS_SCAN_LIMIT", "15000")
    get_settings.cache_clear()
    try:
        _seed_jobs(cov_db, 5000)
        candidate = _candidate(cov_db)
        rows = find_top_matches(cov_db, candidate, limit=200, min_score=0.0, persist=False)
        assert len(rows) <= 200
        scanned_ids = {
            j.id
            for j in cov_db.query(Job)
            .filter(Job.is_validated.is_(True))
            .order_by(Job.scraped_at.desc())
            .limit(get_settings().match_jobs_scan_limit)
            .all()
        }
        assert len(scanned_ids) >= 5000
        if rows:
            assert rows[0]["job_id"] in scanned_ids
    finally:
        get_settings.cache_clear()
