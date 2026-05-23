"""Investor-demo jobs skip Playwright (Cloudflare-safe on headless workers)."""

from __future__ import annotations

from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.automation.types import ApplyOutcome
from app.database.models import Base, Candidate, Job, User
from app.services.auto_apply_service import METHOD_DEMO_SIMULATED, auto_apply_for_user
from app.services.investor_demo_seed import DEMO_BOARD, DEMO_JOB_PREFIX, is_investor_demo_job


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_is_investor_demo_job_by_external_id() -> None:
    job = Job(job_board=DEMO_BOARD, external_id=f"{DEMO_JOB_PREFIX}python-lead", url="https://example.com")
    assert is_investor_demo_job(job) is True
    assert is_investor_demo_job(Job(job_board=DEMO_BOARD, external_id="real-123", url="https://example.com")) is False
    assert is_investor_demo_job(None) is False


def test_auto_apply_investor_demo_skips_playwright() -> None:
    db = _sqlite()
    try:
        user = User(email="founder-demo@test.local", hashed_password="x", is_active=True)
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="Founder Test",
            cv_text="Python FastAPI PostgreSQL — demo CV for package PDF.",
        )
        db.add(cand)
        job = Job(
            job_board=DEMO_BOARD,
            external_id=f"{DEMO_JOB_PREFIX}python-lead",
            title="Senior Python Developer",
            company="Nova Hiring PL",
            url="https://www.pracuj.pl/praca/senior-python-developer-investor-demo-1",
            is_validated=True,
        )
        db.add(job)
        db.commit()

        with patch("app.services.auto_apply_service.run_auto_apply") as mock_apply:
            outcome, message, app = auto_apply_for_user(
                db,
                user=user,
                job_id=job.id,
                submit=True,
                locale="pl",
            )

        mock_apply.assert_not_called()
        assert outcome == ApplyOutcome.SUBMITTED
        assert "demo" in message.lower() or "TWIN" in message
        assert app is not None
        assert app.application_method == METHOD_DEMO_SIMULATED
        assert app.auto_applied is True
        row = db.scalar(select(Job).where(Job.id == job.id))
        assert row is not None
        assert is_investor_demo_job(row)
    finally:
        db.close()
