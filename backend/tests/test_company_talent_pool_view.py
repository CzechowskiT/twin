"""Company talent pool view — coverage, readiness, expanded quality dimensions."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, RecruiterTalentPoolRecord
from app.database.session import get_db
from app.main import app
from app.services.company_talent_pool import build_company_talent_pool
from app.services.recruiter_talent_pool_import import commit_talent_pool_import, preview_talent_pool_import


@pytest.fixture
def api_client() -> Iterator[TestClient]:
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


SAMPLE_CSV = """display_name,job_title,skills,location,seniority,candidate_id
Alex Kowalski,Backend Engineer,Python;FastAPI,Warsaw,mid,CAND-1
Maria Nowak,Backend Engineer,,,,CAND-2
Jan Kowal,Product Manager,SQL;Agile,,senior,
"""


def _seed_pool(db) -> None:
    preview = preview_talent_pool_import(db, company_slug="nova-hiring-pl", csv_text=SAMPLE_CSV)
    commit_talent_pool_import(db, company_slug="nova-hiring-pl", import_id=preview["import_id"])


def test_role_skill_coverage_top_roles_and_skills() -> None:
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
        coverage = out["role_skill_coverage"]
        assert len(coverage["top_roles"]) >= 1
        assert coverage["top_roles"][0]["title"] == "Backend Engineer"
        assert coverage["top_roles"][0]["count"] == 2
        skill_names = {s["skill"] for s in coverage["top_skills"]}
        assert "Python" in skill_names
        assert "Agile" in skill_names
    finally:
        db.close()


def test_role_skill_coverage_weak_roles_and_actions() -> None:
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
        weak = out["role_skill_coverage"]["weak_coverage"]
        assert any(r["role_title"] == "Product Manager" for r in weak)
        actions = {a["code"] for a in out["role_skill_coverage"]["suggested_actions"]}
        assert "ask_recruiter_review" in actions
    finally:
        db.close()


def test_readiness_states_and_counts() -> None:
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
        counts = out["readiness"]["counts"]
        assert counts["ready"] >= 1
        assert counts["needs_enrichment"] >= 1
        assert counts["consent_required"] >= 1
        states = {c["readiness_state"] for c in out["readiness"]["candidates"]}
        assert "ready" in states
        assert "consent_required" in states
    finally:
        db.close()


def test_readiness_duplicate_review_flag() -> None:
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
        first = db.query(RecruiterTalentPoolRecord).first()
        assert first is not None
        dup = RecruiterTalentPoolRecord(
            company_slug="nova-hiring-pl",
            display_name=first.display_name,
            duplicate_key=first.duplicate_key,
            import_id=first.import_id,
            data_quality_json=first.data_quality_json,
            skills_json=first.skills_json,
        )
        db.add(dup)
        db.commit()
        out = build_company_talent_pool(db, company_slug="nova-hiring-pl", locale="en")
        assert out["readiness"]["counts"]["duplicate_review"] >= 2
    finally:
        db.close()


def test_expanded_quality_dimensions() -> None:
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
        dims = out["data_quality"]["dimensions"]
        assert dims.get("missing_location", 0) >= 1
        assert dims.get("missing_seniority", 0) >= 1
        assert dims.get("low_evidence", 0) >= 1
        assert dims.get("missing_role_title", 0) == 0
    finally:
        db.close()


def test_stale_readiness_state() -> None:
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
        rec = db.query(RecruiterTalentPoolRecord).first()
        assert rec is not None
        rec.created_at = datetime.now(timezone.utc) - timedelta(days=200)
        db.commit()
        out = build_company_talent_pool(db, company_slug="nova-hiring-pl", locale="en")
        assert out["readiness"]["counts"]["stale"] >= 1
        assert any(c["readiness_state"] == "stale" for c in out["readiness"]["candidates"])
    finally:
        db.close()


def test_radar_href_present_without_pii(monkeypatch, api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        preview = api_client.post(
            "/api/v1/recruiter/talent-pool/import/preview",
            params={"company_slug": "nova-hiring-pl", "token": "secret"},
            json={"csv_text": SAMPLE_CSV},
        )
        import_id = preview.json()["import_id"]
        api_client.post(
            "/api/v1/recruiter/talent-pool/import/commit",
            params={"company_slug": "nova-hiring-pl", "token": "secret"},
            json={"import_id": import_id},
        )
        res = api_client.get(
            "/api/v1/company/talent-pool?company_slug=nova-hiring-pl&token=secret",
        )
        assert res.status_code == 200
        body = res.json()
        assert body["role_skill_coverage"]["top_roles"]
        assert body["readiness"]["candidates"][0]["radar_href"].startswith("/recruiter/talent-radar")
        assert "email" not in res.text.lower()
        assert "phone" not in res.text.lower()
    finally:
        get_settings.cache_clear()
