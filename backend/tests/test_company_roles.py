from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Candidate, User
from app.services.company_roles import create_company_role, get_company_role, list_company_roles
from tests.test_auth_integration import _sqlite_session
from tests.test_recruiter_inbox import recruiter_api_client  # noqa: F401 — fixture


def test_list_and_create_company_role() -> None:
    db = _sqlite_session()
    try:
        created = create_company_role(
            db,
            company_slug="nova-hiring-pl",
            title="Senior Backend Engineer",
            location="Warsaw",
            work_mode="hybrid",
            status="draft",
            must_have_skills=["Python", "PostgreSQL"],
            nice_to_have_skills=["FastAPI"],
            requirements="Build matching pipelines.",
        )
        assert created["title"] == "Senior Backend Engineer"
        assert created["status"] == "draft"
        assert created["work_mode"] == "hybrid"
        assert created["must_have_skills"] == ["Python", "PostgreSQL"]
        items = list_company_roles(db, company_slug="nova-hiring-pl")
        assert len(items) == 1
        assert items[0]["linked_candidates_count"] == 0
    finally:
        db.close()


def test_linked_candidates_count_includes_applications() -> None:
    db = _sqlite_session()
    try:
        role = create_company_role(
            db,
            company_slug="bravo-inc",
            title="Product Manager",
            status="active",
        )
        user = User(
            email="cand@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(user_id=user.id, name="Sam", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        db.flush()
        db.add(
            Application(
                candidate_id=cand.id,
                job_id=role["id"],
                status=ApplicationStatus.APPLIED,
            )
        )
        db.commit()
        loaded = get_company_role(db, company_slug="bravo-inc", role_id=role["id"])
        assert loaded is not None
        assert loaded["linked_candidates_count"] == 1
    finally:
        db.close()


def test_company_roles_api_crud(
    monkeypatch: pytest.MonkeyPatch, recruiter_api_client: TestClient
) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    try:
        headers = {"X-Twin-Recruiter-Token": "secret"}
        qs = "?company_slug=acme-corp"
        create_res = recruiter_api_client.post(
            f"/api/v1/company/roles{qs}",
            headers=headers,
            json={
                "title": "Data Analyst",
                "location": "Kraków",
                "work_mode": "remote",
                "status": "draft",
                "must_have_skills": ["SQL"],
            },
        )
        assert create_res.status_code == 201, create_res.text
        role_id = create_res.json()["role"]["id"]
        list_res = recruiter_api_client.get(f"/api/v1/company/roles{qs}", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()["items"]) == 1
        patch_res = recruiter_api_client.patch(
            f"/api/v1/company/roles/{role_id}{qs}",
            headers=headers,
            json={"status": "active", "nice_to_have_skills": ["dbt"]},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["role"]["status"] == "active"
        detail_res = recruiter_api_client.get(
            f"/api/v1/company/roles/{role_id}{qs}",
            headers=headers,
        )
        assert detail_res.status_code == 200
        assert detail_res.json()["role"]["nice_to_have_skills"] == ["dbt"]
    finally:
        get_settings.cache_clear()
