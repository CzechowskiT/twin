"""GET /applications/me pagination."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_applications_me_pagination_offset_limit(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="pag@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="T", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    db.refresh(cand)

    base_time = datetime.utcnow()
    for i in range(3):
        j = Job(
            job_board="test",
            external_id=f"e{i}",
            title=f"Job {i}",
            company="Co",
            url=f"https://ex/{i}",
            is_validated=True,
            scraped_at=base_time,
        )
        db.add(j)
    db.commit()

    jobs = db.query(Job).order_by(Job.id.asc()).all()
    for idx, job in enumerate(jobs):
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.PENDING,
                updated_at=base_time + timedelta(minutes=idx),
            ),
        )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="pag@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    try:
        r0 = client.get("/api/v1/applications/me")
        assert r0.status_code == 200
        body0 = r0.json()
        assert body0["total"] == 3
        assert len(body0["items"]) == 3

        r1 = client.get("/api/v1/applications/me?limit=1&offset=0")
        assert r1.status_code == 200
        b1 = r1.json()
        assert b1["total"] == 3
        assert len(b1["items"]) == 1

        r2 = client.get("/api/v1/applications/me?limit=1&offset=1")
        assert r2.status_code == 200
        b2 = r2.json()
        assert b2["total"] == 3
        assert len(b2["items"]) == 1
        assert b2["items"][0]["job_id"] != b1["items"][0]["job_id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
