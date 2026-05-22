"""Company intelligence service (US-C051)."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, CompanyIntelligenceCache, Job
from app.services.company_intelligence import research_company_for_job


@pytest.fixture
def intel_db():
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


def test_research_fallback_without_claude(intel_db) -> None:
    job = Job(
        id=1,
        job_board="pracuj",
        external_id="x1",
        title="Senior Python Developer",
        company="Acme Corp",
        description="Build APIs with FastAPI. Own delivery.",
        requirements="Python, PostgreSQL",
        url="https://example.com/j/1",
        is_validated=True,
    )
    intel_db.add(job)
    intel_db.commit()

    intel, researched_at, from_cache = research_company_for_job(intel_db, job)
    assert from_cache is False
    assert len(intel["priorities"]) == 3
    assert len(intel["pain_points"]) == 3
    assert intel["cover_letter_draft"]
    assert researched_at is not None


def test_research_uses_cache(intel_db) -> None:
    now = datetime.now(timezone.utc)
    job = Job(
        id=2,
        job_board="pracuj",
        external_id="x2",
        title="Data Engineer",
        company="Beta LLC",
        description="ETL pipelines",
        requirements="SQL",
        url="https://example.com/j/2",
        is_validated=True,
    )
    intel_db.add(job)
    intel_db.add(
        CompanyIntelligenceCache(
            company_name="beta llc",
            job_title="data engineer",
            intel_json='{"priorities":["P1","P2","P3"],"pain_points":["A","B","C"],'
            '"insider_language":{"use":["sql"],"avoid":["guru"]},'
            '"cover_letter_draft":"Cached letter."}',
            researched_at=now,
            expires_at=now + timedelta(days=7),
        )
    )
    intel_db.commit()

    intel, _, from_cache = research_company_for_job(intel_db, job)
    assert from_cache is True
    assert intel["cover_letter_draft"] == "Cached letter."
