"""Public MVP traction stats."""

from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from fastapi.testclient import TestClient

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_public_mvp_stats_shape_empty() -> None:
    db = _sqlite()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 200
        body = res.json()
        assert body["validated_jobs"] == 0
        assert body["registered_users"] == 0
        assert body["total_applications"] == 0
        assert body["profiles_with_cv"] == 0
        assert body["job_boards_in_registry"] >= 1
        assert "linkedin_oauth_configured" in body
        assert "stripe_checkout_ready" in body
        assert body["generated_at"].endswith("Z")
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_public_mvp_stats_counts() -> None:
    db = _sqlite()
    u = User(email="stats@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="A", skills="[]", preferred_job_titles="[]", cv_uploaded_at=None)
    db.add(cand)
    db.commit()
    db.refresh(cand)
    j = Job(
        job_board="test",
        external_id="e1",
        title="T",
        company="C",
        url="https://ex/1",
        is_validated=True,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    db.add(Application(candidate_id=cand.id, job_id=j.id, status=ApplicationStatus.PENDING))
    cand.cv_uploaded_at = datetime.utcnow()
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 200
        body = res.json()
        assert body["validated_jobs"] == 1
        assert body["registered_users"] == 1
        assert body["total_applications"] == 1
        assert body["profiles_with_cv"] == 1
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
