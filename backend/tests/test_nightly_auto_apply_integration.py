"""Nightly auto-apply with in-memory DB and mocked browser apply."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.automation.types import ApplyOutcome
from app.database.models import (
    Application,
    AutoApplyConsent,
    AutoApplyRun,
    Base,
    Candidate,
    Job,
    JobMatch,
    User,
)
from app.config import get_settings
from app.services.nightly_auto_apply import (
    process_user_nightly_auto_apply,
    run_nightly_auto_apply_sweep,
)


@pytest.fixture
def nightly_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="nightly@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    candidate = Candidate(user_id=user.id, name="Test")
    db.add(candidate)
    db.commit()
    consent = AutoApplyConsent(
        candidate_id=candidate.id,
        is_active=True,
        consent_given_at=datetime.now(timezone.utc),
        min_score_threshold=90.0,
        daily_limit=10,
    )
    db.add(consent)
    job = Job(
        title="Dev",
        company="Acme",
        job_board="pracuj",
        external_id="offer-1",
        url="https://www.pracuj.pl/offer/1",
        is_validated=True,
    )
    db.add(job)
    db.commit()
    db.add(JobMatch(candidate_id=candidate.id, job_id=job.id, score=95.0))
    db.commit()
    db.refresh(user)
    db.refresh(consent)
    yield db, user, consent, job
    db.close()


def test_process_user_success_mocked(nightly_db, monkeypatch) -> None:
    db, user, consent, job = nightly_db
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    monkeypatch.setenv("NIGHTLY_AUTO_APPLY_COOLDOWN_SECONDS", "0")

    app_row = Application(candidate_id=candidate.id, job_id=job.id, status="applied")

    with (
        patch("app.services.nightly_auto_apply.find_top_matches"),
        patch(
            "app.services.nightly_auto_apply.auto_apply_for_user",
            return_value=(ApplyOutcome.SUBMITTED, "ok", app_row),
        ),
    ):
        row = process_user_nightly_auto_apply(
            db, user=user, consent=consent, settings=get_settings(), submit=False
        )

    assert row["applications_submitted"] == 1
    assert row["skipped_reason"] is None
    assert consent.total_applications_submitted == 1


def test_process_user_rate_limit(nightly_db, monkeypatch) -> None:
    db, user, consent, job = nightly_db
    monkeypatch.setenv("NIGHTLY_AUTO_APPLY_COOLDOWN_SECONDS", "0")
    from app.database.models import AutoApplyEvent

    db.add(
        AutoApplyEvent(
            user_id=user.id,
            job_id=job.id,
            outcome="submitted",
            created_at=datetime.now(timezone.utc),
        )
    )
    consent.daily_limit = 1
    db.commit()

    with (
        patch("app.services.nightly_auto_apply.find_top_matches"),
        patch("app.services.nightly_auto_apply.auto_apply_for_user") as mock_apply,
    ):
        row = process_user_nightly_auto_apply(
            db, user=user, consent=consent, settings=get_settings(), submit=False
        )
        mock_apply.assert_not_called()

    assert row["skipped_reason"] == "rate_limit"


def test_sweep_dry_run_mocked_session(nightly_db) -> None:
    db, _user, _consent, _job = nightly_db

    class FakeSession:
        def query(self, *args, **kwargs):
            return db.query(*args, **kwargs)

        def add(self, obj):
            return db.add(obj)

        def commit(self):
            return db.commit()

        def close(self) -> None:
            pass

    with patch("app.database.session.SessionLocal", FakeSession):
        stats = run_nightly_auto_apply_sweep(dry_run=True)

    assert stats["dry_run"] is True
    assert stats["total_users_processed"] == 1


def test_sweep_persists_auto_apply_run(nightly_db) -> None:
    db, user, consent, job = nightly_db
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    app_row = Application(candidate_id=candidate.id, job_id=job.id, status="applied")

    class FakeSession:
        def query(self, *args, **kwargs):
            return db.query(*args, **kwargs)

        def add(self, obj):
            return db.add(obj)

        def commit(self):
            return db.commit()

        def close(self) -> None:
            pass

    with (
        patch("app.database.session.SessionLocal", FakeSession),
        patch("app.services.nightly_auto_apply.find_top_matches"),
        patch(
            "app.services.nightly_auto_apply.auto_apply_for_user",
            return_value=(ApplyOutcome.SUBMITTED, "ok", app_row),
        ),
    ):
        stats = run_nightly_auto_apply_sweep(dry_run=False)

    assert stats["total_users_processed"] == 1
    run = db.query(AutoApplyRun).order_by(AutoApplyRun.started_at.desc()).first()
    assert run is not None
    assert run.total_applications_submitted == 1
    assert run.finished_at is not None
