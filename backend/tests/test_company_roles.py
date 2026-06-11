from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Candidate, User
from app.services.company_roles import create_company_role, get_company_role, list_company_roles
from tests.test_auth_integration import _sqlite_session
from tests.test_recruiter_inbox import recruiter_api_client  # noqa: F401


def test_list_and_create_company_role() -> None:
    db = _sqlite_session()
    try:
        created = create_company_role(
            db,
            company_slug="nova-hiring-pl",
            title="Senior Backend Engineer",
            work_mode="hybrid",
            status="draft",
            must_have_skills=["Python"],
        )
        assert created["status"] == "draft"
        assert len(list_company_roles(db, company_slug="nova-hiring-pl")) == 1
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
        res = recruiter_api_client.post(
            f"/api/v1/company/roles{qs}",
            headers=headers,
            json={"title": "Data Analyst", "status": "draft"},
        )
        assert res.status_code == 201, res.text
        role_id = res.json()["role"]["id"]
        assert recruiter_api_client.get(f"/api/v1/company/roles{qs}", headers=headers).status_code == 200
        patch = recruiter_api_client.patch(
            f"/api/v1/company/roles/{role_id}{qs}",
            headers=headers,
            json={"status": "active"},
        )
        assert patch.json()["role"]["status"] == "active"
    finally:
        get_settings.cache_clear()
