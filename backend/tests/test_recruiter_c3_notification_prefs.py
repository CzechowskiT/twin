"""Recruiter Wave C slice 3 — in-app notification preferences tests."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect

from app.config import get_settings
from app.database.models import Base, RecruiterNotificationPreferences, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_notification_prefs_persistence import (
    get_notification_prefs,
    patch_notification_prefs,
    put_notification_prefs,
    reset_notification_prefs,
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


def test_migration_074_table_columns(client) -> None:
    _, session = client
    insp = inspect(session.get_bind())
    assert insp.has_table("recruiter_notification_preferences")
    cols = {c["name"] for c in insp.get_columns("recruiter_notification_preferences")}
    assert "in_app_inbox_digest" in cols
    assert "company_slug" in cols


def test_get_defaults_on_first_access(client) -> None:
    _, session = client
    out = get_notification_prefs(session, company_slug="Nova Hiring PL")
    assert out["in_app_inbox_digest"] is True
    assert out["in_app_trust_review_alert"] is True


def test_patch_single_field(client) -> None:
    _, session = client
    out = patch_notification_prefs(
        session,
        company_slug="Nova Hiring PL",
        data={"in_app_inbox_digest": False},
    )
    assert out["in_app_inbox_digest"] is False
    assert out["in_app_interview_reminder"] is True


def test_put_replaces_all(client) -> None:
    _, session = client
    out = put_notification_prefs(
        session,
        company_slug="Nova Hiring PL",
        data={
            "in_app_inbox_digest": False,
            "in_app_interview_reminder": False,
            "in_app_trust_review_alert": True,
            "in_app_pipeline_update": False,
        },
    )
    assert out["in_app_pipeline_update"] is False


def test_reset_restores_defaults(client) -> None:
    _, session = client
    patch_notification_prefs(session, company_slug="Nova Hiring PL", data={"in_app_inbox_digest": False})
    out = reset_notification_prefs(session, company_slug="Nova Hiring PL")
    assert out["in_app_inbox_digest"] is True


def test_tenant_isolation(client) -> None:
    _, session = client
    patch_notification_prefs(session, company_slug="Company A", data={"in_app_inbox_digest": False})
    a = get_notification_prefs(session, company_slug="Company A")
    b = get_notification_prefs(session, company_slug="Company B")
    assert a["in_app_inbox_digest"] is False
    assert b["in_app_inbox_digest"] is True


def test_api_get_notification_preferences(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    r = c.get("/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl", headers=_headers())
    assert r.status_code == 200
    body = r.json()
    assert "in_app_inbox_digest" in body
    get_settings.cache_clear()


def test_api_patch_notification_preferences(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    r = c.patch(
        "/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl",
        headers=_headers(),
        json={"in_app_trust_review_alert": False},
    )
    assert r.status_code == 200
    assert r.json()["in_app_trust_review_alert"] is False
    get_settings.cache_clear()


def test_api_put_notification_preferences(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    r = c.put(
        "/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl",
        headers=_headers(),
        json={
            "in_app_inbox_digest": True,
            "in_app_interview_reminder": False,
            "in_app_trust_review_alert": True,
            "in_app_pipeline_update": True,
        },
    )
    assert r.status_code == 200
    assert r.json()["in_app_interview_reminder"] is False
    get_settings.cache_clear()


def test_api_reset_notification_preferences(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    c.patch(
        "/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl",
        headers=_headers(),
        json={"in_app_pipeline_update": False},
    )
    r = c.post(
        "/api/v1/recruiter/notification-preferences/reset?company_slug=nova-hiring-pl",
        headers=_headers(),
    )
    assert r.status_code == 200
    assert r.json()["in_app_pipeline_update"] is True
    get_settings.cache_clear()


def test_api_patch_empty_body_400(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, _ = client
    r = c.patch(
        "/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl",
        headers=_headers(),
        json={},
    )
    assert r.status_code == 400
    get_settings.cache_clear()


def test_api_unauthenticated_401(client) -> None:
    c, _ = client
    r = c.get("/api/v1/recruiter/notification-preferences?company_slug=nova-hiring-pl")
    assert r.status_code in (401, 503)


def test_persistence_row_count_per_company(client) -> None:
    _, session = client
    get_notification_prefs(session, company_slug="Only One Co")
    get_notification_prefs(session, company_slug="Only One Co")
    count = session.query(RecruiterNotificationPreferences).count()
    assert count == 1
