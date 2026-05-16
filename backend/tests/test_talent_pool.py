"""Talent pool anonymous listing API."""

from datetime import datetime
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.api.talent_pool import candidate_public_id, is_talent_pool_validated


def test_candidate_public_id_stable() -> None:
    a = candidate_public_id("secret", 42)
    b = candidate_public_id("secret", 42)
    assert a == b
    assert len(a) == 20
    assert a != candidate_public_id("other", 42)


def test_pool_validated_requires_skills_or_cv() -> None:
    user_ok = User(
        email="u1@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime(2024, 1, 1),
    )
    c_skills = Candidate(
        user_id=1,
        name="Hidden",
        skills='["a","b","c"]',
        talent_pool_opt_in=True,
    )
    c_skills.user = user_ok
    assert is_talent_pool_validated(user_ok, c_skills) is True

    c_cv = Candidate(
        user_id=1,
        name="Hidden",
        skills="[]",
        cv_text="some text",
        talent_pool_opt_in=True,
    )
    c_cv.user = user_ok
    assert is_talent_pool_validated(user_ok, c_cv) is True

    c_weak = Candidate(
        user_id=1,
        name="Hidden",
        skills='["x","y"]',
        cv_text=None,
        talent_pool_opt_in=True,
    )
    c_weak.user = user_ok
    assert is_talent_pool_validated(user_ok, c_weak) is False


def _sqlite_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_anonymous_talent_pool_endpoint() -> None:
    db = _sqlite_session()
    user = User(
        email="pool@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime(2024, 1, 1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="Secret Name",
        skills='["python", "sales", "crm"]',
        preferred_job_titles='["Account Executive"]',
        experience_years=6,
        desired_salary=20000,
        talent_pool_opt_in=True,
    )
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        with patch("app.api.talent_pool.get_settings") as m:
            m.return_value.secret_key = "unit-test-secret"
            client = TestClient(app)
            res = client.get(
                "/api/v1/talent-pool/anonymous",
                params={"job_title": "Account Executive", "required_skills": "python,sales"},
            )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert set(item.keys()) == {"public_id", "skills", "validated", "match_percent"}
        assert item["public_id"] == candidate_public_id("unit-test-secret", cand.id)
        assert "Secret" not in str(item)
        assert item["validated"] is True
        assert 0 <= item["match_percent"] <= 100
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_anonymous_talent_pool_job_id_404() -> None:
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        with patch("app.api.talent_pool.get_settings") as m:
            m.return_value.secret_key = "k"
            client = TestClient(app)
            res = client.get("/api/v1/talent-pool/anonymous", params={"job_id": 999})
        assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_anonymous_talent_pool_uses_saved_job() -> None:
    db = _sqlite_session()
    user = User(
        email="j@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime(2024, 1, 1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    job = Job(
        job_board="test",
        external_id="e1",
        title="Python Developer",
        company="Acme",
        location="Remote",
        requirements="python fastapi",
        description="api",
        url="https://example.com/j",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    cand = Candidate(
        user_id=user.id,
        name="X",
        skills='["python","fastapi"]',
        talent_pool_opt_in=True,
    )
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        with patch("app.api.talent_pool.get_settings") as m:
            m.return_value.secret_key = "k"
            client = TestClient(app)
            res = client.get("/api/v1/talent-pool/anonymous", params={"job_id": job.id})
        assert res.status_code == 200
        assert res.json()["total"] == 1
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
