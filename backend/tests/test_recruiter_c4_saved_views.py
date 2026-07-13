"""Recruiter Wave C slice 4 — saved views persistence tests."""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.models import Base
from app.database.session import get_db
from app.main import app
from app.services.recruiter_saved_views_persistence import (
    create_saved_view,
    delete_saved_view,
    list_saved_views,
    update_saved_view,
)
from tests.test_auth_integration import _sqlite_session


def _headers() -> dict[str, str]:
    return {"X-Twin-Recruiter-Token": "test-recruiter-token"}


@pytest.fixture()
def client():
    session = _sqlite_session()
    Base.metadata.create_all(bind=session.get_bind())
    session.commit()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, session
    app.dependency_overrides.clear()


def test_create_and_list_saved_view(client) -> None:
    _, session = client
    create_saved_view(
        session,
        company_slug="Nova Hiring PL",
        payload={"surface": "inbox", "name": "High priority", "filter_json": {"status": "pending"}},
    )
    out = list_saved_views(session, company_slug="Nova Hiring PL", surface="inbox")
    assert out["count"] == 1
    assert out["items"][0]["name"] == "High priority"


def test_tenant_isolation_saved_views(client) -> None:
    _, session = client
    create_saved_view(session, company_slug="Co A", payload={"surface": "talent_pool", "name": "A", "filter_json": {}})
    assert list_saved_views(session, company_slug="Co B")["count"] == 0


def test_update_saved_view(client) -> None:
    _, session = client
    row = create_saved_view(
        session,
        company_slug="Nova Hiring PL",
        payload={"surface": "trust_review", "name": "Pending", "filter_json": {"status": "pending"}},
    )
    updated = update_saved_view(session, company_slug="Nova Hiring PL", view_id=row["id"], fields={"name": "All pending"})
    assert updated["name"] == "All pending"


def test_delete_saved_view(client) -> None:
    _, session = client
    row = create_saved_view(
        session,
        company_slug="Nova Hiring PL",
        payload={"surface": "inbox", "name": "Temp", "filter_json": {}},
    )
    delete_saved_view(session, company_slug="Nova Hiring PL", view_id=row["id"])
    assert list_saved_views(session, company_slug="Nova Hiring PL")["count"] == 0


def test_api_create_saved_view(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    r = c.post(
        "/api/v1/recruiter/saved-views?company_slug=nova-hiring-pl",
        headers=_headers(),
        json={"surface": "inbox", "name": "API view", "filter_json": {"segment": "new"}},
    )
    assert r.status_code == 201
    get_settings.cache_clear()


def test_api_list_saved_views(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, session = client
    create_saved_view(session, company_slug="Nova Hiring PL", payload={"surface": "inbox", "name": "L", "filter_json": {}})
    r = c.get("/api/v1/recruiter/saved-views?company_slug=nova-hiring-pl&surface=inbox", headers=_headers())
    assert r.status_code == 200
    assert r.json()["count"] >= 1
    get_settings.cache_clear()


def test_invalid_surface_rejected(client) -> None:
    _, session = client
    with pytest.raises(ValueError):
        create_saved_view(session, company_slug="X", payload={"surface": "email", "name": "n", "filter_json": {}})


def test_default_view_clears_others(client) -> None:
    _, session = client
    create_saved_view(
        session,
        company_slug="Nova Hiring PL",
        payload={"surface": "inbox", "name": "A", "filter_json": {}, "is_default": True},
    )
    create_saved_view(
        session,
        company_slug="Nova Hiring PL",
        payload={"surface": "inbox", "name": "B", "filter_json": {}, "is_default": True},
    )
    items = list_saved_views(session, company_slug="Nova Hiring PL")["items"]
    defaults = [i for i in items if i["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["name"] == "B"
