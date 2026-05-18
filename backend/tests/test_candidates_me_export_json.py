"""GDPR-style JSON export for the signed-in user."""

from datetime import datetime
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


def test_me_export_json_unauthenticated() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/candidates/me/export.json")
    assert res.status_code == 401


def test_me_export_json_contains_dashboard_and_user() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(email="export@example.com", hashed_password="x", gdpr_consent_at=datetime(2024, 1, 1))
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="Ex",
        skills='["go"]',
        preferred_job_titles='["Dev"]',
        experience_years=3,
        talent_pool_opt_in=False,
    )
    db.add(cand)
    db.commit()
    scraped = datetime(2024, 2, 1)
    job = Job(
        job_board="test",
        external_id="ext-1",
        title="Engineer",
        company="Acme",
        url="https://jobs.example/1",
        is_validated=True,
        scraped_at=scraped,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    db.refresh(cand)
    db.add(
        Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
        ),
    )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        with patch("app.api.candidates.get_settings") as m:
            m.return_value.frontend_url = "https://app.example"
            token = create_access_token(user.email)
            client = TestClient(app)
            res = client.get(
                "/api/v1/candidates/me/export.json",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 200
        assert "attachment" in (res.headers.get("content-disposition") or "").lower()
        data = res.json()
        assert data["export_schema_version"] == 1
        assert data["dashboard_url"] == "https://app.example/dashboard"
        assert data["user"]["email"] == "export@example.com"
        assert "hashed_password" not in data["user"]
        assert "stripe_customer_id" not in data["user"]
        assert "referral_public_token" not in data["user"]
        assert data["candidate"]["name"] == "Ex"
        assert len(data["applications"]) == 1
        assert data["applications"][0]["job_id"] == job.id
        sm = data["applications_summary"]
        assert sm["total"] == 1
        assert sm["by_status"].get("applied") == 1
        assert sm["applications"][0]["title"] == "Engineer"
        assert sm["applications"][0]["company"] == "Acme"
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
