"""Placement event listing must not cross tenant boundaries (IDOR regression)."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, PlacementEvent, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_placement_events_not_readable_for_other_users_application(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    u_a = User(email="a@example.com", hashed_password="x")
    u_b = User(email="b@example.com", hashed_password="x")
    db.add_all([u_a, u_b])
    db.commit()
    db.refresh(u_a)
    db.refresh(u_b)

    ca = Candidate(user_id=u_a.id, name="A", skills="[]", preferred_job_titles="[]")
    cb = Candidate(user_id=u_b.id, name="B", skills="[]", preferred_job_titles="[]")
    db.add_all([ca, cb])
    db.commit()
    db.refresh(ca)
    db.refresh(cb)

    scraped = datetime.now(timezone.utc)
    job = Job(
        job_board="test",
        external_id="e1",
        title="T",
        company="C",
        url="https://example.com/j",
        is_validated=True,
        scraped_at=scraped,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    app_row = Application(
        candidate_id=ca.id,
        job_id=job.id,
        status=ApplicationStatus.PENDING,
        updated_at=scraped,
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)

    ev = PlacementEvent(
        application_id=app_row.id,
        event_type="test_event",
        actor="system",
        detail_json=None,
    )
    db.add(ev)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    def user_b() -> User:
        x = User(email="b@example.com", hashed_password=None)
        x.id = u_b.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = user_b
    try:
        r = client.get(f"/api/v1/applications/{app_row.id}/placement-events")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
