"""Market coverage: active feed, upsert refresh, metrics."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, Candidate, Job, User
from app.scrapers.base import ScrapedJob
from app.services.job_storage import upsert_jobs
from app.services.market_coverage import (
    active_feed_cutoff,
    apply_active_feed_filter,
    build_market_coverage_report,
    count_active_validated_jobs,
)
from app.services.matching_service import find_top_matches
from app.matching.quality_gate import DASHBOARD_MATCH_LIMIT


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


def _job(
    db,
    *,
    board: str,
    ext: str,
    scraped_at: datetime,
    title: str = "Python Developer",
) -> Job:
    row = Job(
        job_board=board,
        external_id=ext,
        title=title,
        company="Acme",
        description="Python",
        requirements="Python",
        url=f"https://example.com/jobs/{ext}",
        is_validated=True,
        scraped_at=scraped_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _candidate(db) -> Candidate:
    now = datetime.now(timezone.utc)
    user = User(
        email="cov@example.com",
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
        name="Cov",
        skills='["python"]',
        preferred_job_titles='["Python Developer"]',
        experience_years=4,
        location="Warszawa",
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def test_active_feed_excludes_stale_validated(cov_db) -> None:
    now = datetime.utcnow()
    _job(cov_db, board="pracuj.pl", ext="fresh-1", scraped_at=now - timedelta(days=10))
    _job(cov_db, board="pracuj.pl", ext="stale-1", scraped_at=now - timedelta(days=60))
    assert count_active_validated_jobs(cov_db, days=45) == 1


def test_apply_active_feed_filter_on_query(cov_db) -> None:
    now = datetime.utcnow()
    _job(cov_db, board="rocketjobs.pl", ext="a", scraped_at=now)
    _job(cov_db, board="rocketjobs.pl", ext="b", scraped_at=now - timedelta(days=50))
    rows = apply_active_feed_filter(cov_db.query(Job), days=45).all()
    assert len(rows) == 1


def test_upsert_refreshes_scraped_at_for_existing(cov_db) -> None:
    old = datetime.utcnow() - timedelta(days=40)
    _job(cov_db, board="justjoin.it", ext="jj-1", scraped_at=old)
    scraped = ScrapedJob(
        job_board="justjoin.it",
        external_id="jj-1",
        title="Backend Dev",
        company="Acme",
        url="https://justjoin.it/offers/jj-1",
        description="Python API",
        requirements="Python",
    )
    assert upsert_jobs(cov_db, [scraped]) == 0
    row = cov_db.query(Job).filter(Job.external_id == "jj-1").one()
    assert row.scraped_at >= active_feed_cutoff(days=45)


def test_build_market_coverage_report_keys(cov_db) -> None:
    now = datetime.utcnow()
    _job(cov_db, board="pracuj.pl", ext="r1", scraped_at=now)
    report = build_market_coverage_report(cov_db)
    assert report["validated_jobs_total"] >= 1
    assert report["active_validated_jobs"] >= 1
    assert "total_jobs_by_source" in report


def test_find_top_matches_respects_active_window(cov_db) -> None:
    now = datetime.utcnow()
    candidate = _candidate(cov_db)
    active = _job(cov_db, board="pracuj.pl", ext="active", scraped_at=now)
    stale = _job(cov_db, board="pracuj.pl", ext="stale", scraped_at=now - timedelta(days=90))
    rows = find_top_matches(cov_db, candidate, limit=DASHBOARD_MATCH_LIMIT, min_score=0.0, persist=False)
    ids = {r["job_id"] for r in rows}
    assert active.id in ids
    assert stale.id not in ids
