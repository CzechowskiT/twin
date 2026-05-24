"""API tests for competitive job board endpoints."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_job_match_score_endpoint(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="match@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="Dev",
        skills='["python", "react"]',
        preferred_job_titles='["engineer"]',
    )
    db.add(cand)
    job = Job(
        job_board="test",
        external_id="x1",
        title="Python Engineer",
        company="Co",
        url="https://ex/1",
        requirements="Python React TypeScript",
        is_validated=True,
        scraped_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = User(email="match@example.com", hashed_password=None)
        row.id = user.id
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    try:
        r = client.get(f"/api/v1/jobs/{job.id}/match-score")
        assert r.status_code == 200
        body = r.json()
        assert body["job_id"] == job.id
        assert body["skill_match_percent"] >= 50.0
    finally:
        app.dependency_overrides.clear()
