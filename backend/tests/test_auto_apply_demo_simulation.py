"""Demo-mode auto-apply skips Playwright for investor-demo jobs."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.automation.types import ApplyOutcome
from app.database.models import Base, Candidate, Job, User
from app.services.auto_apply_service import auto_apply_for_user
from app.services.investor_demo_seed import DEMO_JOB_PREFIX, is_investor_demo_job


@pytest.fixture
def demo_apply_db(monkeypatch):
    monkeypatch.setenv("DEMO_MODE_ENABLED", "true")
    from app.config import get_settings

    get_settings.cache_clear()

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="founder@test.com", hashed_password="x", is_active=True)
    user.onboarding_completed_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    candidate = Candidate(user_id=user.id, name="Founder")
    db.add(candidate)
    db.commit()
    job = Job(
        title="Staff Backend",
        company="Twin Labs",
        job_board="pracuj",
        external_id=f"{DEMO_JOB_PREFIX}backend-staff",
        url="https://www.pracuj.pl/praca/staff-backend-engineer-investor-demo-2",
        is_validated=True,
    )
    db.add(job)
    db.commit()
    yield db, user, candidate, job
    db.close()
    get_settings.cache_clear()


def test_is_investor_demo_job() -> None:
    job = Job(external_id=f"{DEMO_JOB_PREFIX}python-lead", job_board="pracuj")
    assert is_investor_demo_job(job) is True
    assert is_investor_demo_job(Job(external_id="real-offer-1", job_board="pracuj")) is False


def test_demo_simulated_apply_without_playwright(demo_apply_db, monkeypatch) -> None:
    db, user, _candidate, job = demo_apply_db
    from app.config import get_settings

    demo_settings = get_settings().model_copy(update={"demo_mode_enabled": True})
    monkeypatch.setattr("app.services.auto_apply_service.get_settings", lambda: demo_settings)
    outcome, message, app = auto_apply_for_user(db, user=user, job_id=job.id, submit=True, locale="pl")
    assert outcome == ApplyOutcome.SUBMITTED
    assert "TWIN" in message
    assert app is not None
    assert app.auto_applied is True
    assert app.application_method == "auto_apply_demo_simulated"
