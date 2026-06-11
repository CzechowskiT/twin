from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.company_pipeline_quality import build_company_pipeline_quality
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def recruiter_api_client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_db, None)


def test_build_company_pipeline_quality_groups_by_role() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="cpq@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Alex", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="cpq-j1",
            title="Backend Engineer",
            company="Nova Hiring PL",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.APPLIED,
            )
        )
        db.commit()
        out = build_company_pipeline_quality(db, company_slug="nova-hiring-pl", locale="en")
        assert out["company_slug"] == "nova-hiring-pl"
        assert out["source"] == "workspace"
        assert out["total_applications"] == 1
        assert out["company_totals"]["in_review"] == 1
        assert len(out["roles"]) == 1
        assert out["roles"][0]["role_title"] == "Backend Engineer"
        assert out["roles"][0]["segments"]["in_review"] == 1
        assert "candidate_name" not in str(out)
        assert "email" not in str(out)
    finally:
        db.close()


def test_company_pipeline_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/company/pipeline-quality?company_slug=nova-hiring-pl")
        assert res.status_code == 401
        assert res.json()["detail"] == "recruiter_inbox_invalid_token"
        assert "RECRUITER_INBOX_TOKEN" not in res.text
    finally:
        get_settings.cache_clear()


def test_company_pipeline_payload_has_no_pii_keys() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="hidden@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Secret Name", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="cpq-j2",
            title="Engineer",
            company="Acme Corp",
            url="https://example.com/j2",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=job.id,
                status=ApplicationStatus.REJECTED,
            )
        )
        db.commit()
        out = build_company_pipeline_quality(db, company_slug="acme-corp", locale="en")
        forbidden = {"email", "candidate_name", "phone", "name", "user_id", "hashed_password"}
        assert forbidden.isdisjoint(set(out.keys()))
        for role in out["roles"]:
            assert forbidden.isdisjoint(set(role.keys()))
    finally:
        db.close()
