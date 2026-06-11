"""Tests for company billing readiness API."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, Job, User
from app.database.session import get_db
from app.main import app
from app.services.company_billing_readiness import build_company_plan_usage
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


def test_company_plan_usage_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/company/plan-usage?company_slug=nova-hiring-pl")
        assert res.status_code == 401
    finally:
        get_settings.cache_clear()


def test_build_company_plan_usage_shape() -> None:
    db = _sqlite_session()
    settings = get_settings()
    try:
        job = Job(
            job_board="employer",
            external_id="nova-hiring-pl-role-1",
            title="Engineer",
            company="Nova Hiring",
            url="https://example.com/j1",
            is_validated=True,
            role_status="active",
        )
        db.add(job)
        db.commit()
        out = build_company_plan_usage(db, company_slug="nova-hiring-pl", settings=settings)
        assert out["company_slug"] == "nova-hiring-pl"
        assert out["billing_live"] is False
        assert out["plan"] in ("demo", "pilot", "free")
        assert "open_roles" in out["usage"]
        assert "email" not in str(out).lower()
    finally:
        db.close()
