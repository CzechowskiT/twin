"""Investor demo seed — idempotent upserts (sqlite, no password in repo)."""

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import (
    Application,
    Base,
    Job,
    JobMatch,
    ScheduledInterview,
    User,
)
from app.services.investor_demo_seed import (
    DEFAULT_DEMO_EMAIL,
    DEMO_JOB_PREFIX,
    run_investor_demo_seed,
)


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_investor_demo_seed_idempotent() -> None:
    db = _sqlite()
    email = f"seed-test-{DEFAULT_DEMO_EMAIL}"
    password = "test-seed-password-12"

    try:
        run_investor_demo_seed(db, email=email, password=password, recompute_live_scores=False)
        db.commit()
        first_jobs = db.scalar(
            select(func.count()).select_from(Job).where(Job.external_id.like(f"{DEMO_JOB_PREFIX}%"))
        )
        first_matches = db.scalar(select(func.count()).select_from(JobMatch))
        first_apps = db.scalar(select(func.count()).select_from(Application))
        first_iv = db.scalar(select(func.count()).select_from(ScheduledInterview))

        run_investor_demo_seed(db, email=email, password=password, recompute_live_scores=False)
        db.commit()

        assert db.scalar(
            select(func.count()).select_from(Job).where(Job.external_id.like(f"{DEMO_JOB_PREFIX}%"))
        ) == first_jobs == 5
        assert db.scalar(select(func.count()).select_from(JobMatch)) == first_matches == 5
        assert db.scalar(select(func.count()).select_from(Application)) == first_apps == 1
        assert db.scalar(select(func.count()).select_from(ScheduledInterview)) == first_iv == 1
        assert db.scalar(select(func.count()).select_from(User).where(User.email == email)) == 1
    finally:
        db.close()
