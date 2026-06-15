"""Tests for company talent pool view — company scoping and no PII."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.session import get_db
from app.main import app
from app.services.company_talent_pool import build_company_talent_pool
from app.services.recruiter_talent_pool_import import commit_talent_pool_import, preview_talent_pool_import


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


SAMPLE_CSV = """display_name,job_title,skills,location,candidate_id
Alex Kowalski,Backend Engineer,Python;FastAPI,Warsaw,CAND-1
Maria Nowak,,Agile,Krakow,
"""


def _seed_pool(db) -> None:
    preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
    commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])


def test_build_company_talent_pool_scoped_and_summarized() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        _seed_pool(db)
        out = build_company_talent_pool(db, company_slug="nova-hiring-pl", locale="en")
        assert out["company_slug"] == "nova-hiring-pl"
        assert out["source"] == "workspace"
        assert out["executive_summary"]["imported_candidates"] == 2
        assert out["executive_summary"]["known_candidates"] == 1
        assert out["summary"]["total_records"] == 2
        assert out["source_coverage"]["import_pool"] == 2
        assert out["source_coverage"]["live_ats_sync"] is False
        assert "dimensions" in out["data_quality"]
        assert "email" not in str(out).lower()
        assert "phone" not in str(out).lower()
    finally:
        db.close()


def test_company_talent_pool_api_requires_token(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        res = recruiter_api_client.get("/api/v1/company/talent-pool?company_slug=nova-hiring-pl")
        assert res.status_code == 401
        assert res.json()["detail"] == "recruiter_inbox_invalid_token"
    finally:
        get_settings.cache_clear()


def test_company_talent_pool_api_company_scoping(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        preview = recruiter_api_client.post(
            "/api/v1/recruiter/talent-pool/import/preview",
            params={"company_slug": "nova-hiring-pl", "token": "secret"},
            json={"csv_text": SAMPLE_CSV},
        )
        assert preview.status_code == 200
        import_id = preview.json()["import_id"]
        commit = recruiter_api_client.post(
            "/api/v1/recruiter/talent-pool/import/commit",
            params={"company_slug": "nova-hiring-pl", "token": "secret"},
            json={"import_id": import_id},
        )
        assert commit.status_code == 200

        res = recruiter_api_client.get(
            "/api/v1/company/talent-pool?company_slug=nova-hiring-pl&token=secret",
        )
        assert res.status_code == 200
        body = res.json()
        assert body["company_slug"] == "nova-hiring-pl"
        assert body["executive_summary"]["imported_candidates"] == 2
        assert body["source"] == "workspace"
        assert "email" not in res.text.lower()
    finally:
        get_settings.cache_clear()
