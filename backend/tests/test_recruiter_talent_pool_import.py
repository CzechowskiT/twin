"""Tests for recruiter talent pool CSV import MVP."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base, RecruiterTalentPoolImport, RecruiterTalentPoolRecord
from app.database.session import get_db
from app.main import app
from app.services.recruiter_talent_pool import build_recruiter_talent_pool
from app.services.recruiter_talent_pool_import import (
    TALENT_POOL_AUDIT_EVENT_TYPES,
    commit_talent_pool_import,
    preview_talent_pool_import,
)


@pytest.fixture
def pool_api_client() -> Iterator[TestClient]:
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


SAMPLE_CSV = """display_name,job_title,skills,location,external_ats_id
Alex Kowalski,Backend Engineer,Python;FastAPI,Warsaw,ATS-100
Maria Nowak,Product Manager,Agile;Roadmap,Krakow,ATS-101
"""


def test_audit_event_types_defined() -> None:
    assert "talent_pool_import_previewed" in TALENT_POOL_AUDIT_EVENT_TYPES
    assert "talent_pool_import_committed" in TALENT_POOL_AUDIT_EVENT_TYPES
    assert "talent_pool_record_created" in TALENT_POOL_AUDIT_EVENT_TYPES
    assert "talent_pool_duplicate_detected" in TALENT_POOL_AUDIT_EVENT_TYPES
    assert "talent_pool_import_failed" in TALENT_POOL_AUDIT_EVENT_TYPES


def test_preview_parses_csv(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        out = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        assert out["summary"]["total"] == 2
        assert out["summary"]["ready"] == 2
        assert out["import_id"] > 0
        events = out["audit_events"]
        assert any(e["event_type"] == "talent_pool_import_previewed" for e in events)
    finally:
        db.close()


def test_preview_rejects_forbidden_email_column(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        with pytest.raises(ValueError, match="Forbidden column"):
            preview_talent_pool_import(
                db,
                company_slug="nova-hiring-pl",
                csv_text="display_name,email\nAlex,a@b.com\n",
            )
    finally:
        db.close()


def test_commit_creates_records(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        out = commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])
        assert out["summary"]["accepted"] == 2
        records = db.query(RecruiterTalentPoolRecord).all()
        assert len(records) == 2
        assert records[0].display_name == "Alex Kowalski"
        events = out["audit_events"]
        assert any(e["event_type"] == "talent_pool_import_committed" for e in events)
        assert any(e["event_type"] == "talent_pool_record_created" for e in events)
    finally:
        db.close()


def test_duplicate_detection_on_second_import(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        first = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=first["import_id"])
        second = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        assert second["summary"]["duplicates"] == 2
        assert any(e["event_type"] == "talent_pool_duplicate_detected" for e in second["audit_events"])
    finally:
        db.close()


def test_api_preview_endpoint(pool_api_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    try:
        res = pool_api_client.post(
            "/api/v1/recruiter/talent-pool/import/preview",
            params={"company_slug": "nova-hiring-pl", "token": "test-token"},
            json={"csv_text": SAMPLE_CSV},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["summary"]["ready"] == 2
    finally:
        get_settings.cache_clear()


def test_api_list_talent_pool(pool_api_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    try:
        preview = pool_api_client.post(
            "/api/v1/recruiter/talent-pool/import/preview",
            params={"company_slug": "nova-hiring-pl", "token": "test-token"},
            json={"csv_text": SAMPLE_CSV},
        ).json()
        pool_api_client.post(
            "/api/v1/recruiter/talent-pool/import/commit",
            params={"company_slug": "nova-hiring-pl", "token": "test-token"},
            json={"import_id": preview["import_id"]},
        )
        res = pool_api_client.get(
            "/api/v1/recruiter/talent-pool",
            params={"company_slug": "nova-hiring-pl", "token": "test-token"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["summary"]["total_records"] == 2
        assert body["source_coverage"]["external_sourcing"] is False
        assert body["source_coverage"]["live_ats_sync"] is False
    finally:
        get_settings.cache_clear()


def test_import_status_transitions(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        row = db.query(RecruiterTalentPoolImport).filter_by(id=preview["import_id"]).first()
        assert row is not None
        assert row.status == "preview"
        commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])
        db.refresh(row)
        assert row.status == "committed"
        assert row.committed_at is not None
    finally:
        db.close()


def test_data_quality_scoring(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        sparse = preview_talent_pool_import(
            db,
            company_slug="nova-hiring-pl",
            csv_text="display_name\nMinimal Name\n",
        )
        row = sparse["rows"][0]
        assert row["data_quality"]["level"] in ("high", "medium", "low")
        assert "missing_skills" in row["data_quality"]["warnings"]
    finally:
        db.close()


def test_company_slug_required(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        with pytest.raises(ValueError):
            preview_talent_pool_import(db, company_slug="", csv_text=SAMPLE_CSV)
    finally:
        db.close()


def test_build_talent_pool_summary(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])
        out = build_recruiter_talent_pool(db, company_slug="nova-hiring-pl")
        assert out["summary"]["total_records"] == 2
        assert out["source_coverage"]["imported_internal_pool"] == 2
    finally:
        db.close()


def test_no_pii_columns_in_records(pool_api_client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine)
    db = session_local()
    try:
        preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
        commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])
        rec = db.query(RecruiterTalentPoolRecord).first()
        assert rec is not None
        assert not hasattr(rec, "email")
        assert not hasattr(rec, "phone")
    finally:
        db.close()
