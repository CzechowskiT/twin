"""Idempotency and concurrency guards for Wave C persistence."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import Base
from app.database.session import get_db
from app.main import app
from app.services.recruiter_talent_pool_persistence import add_talent_pool_record
from tests.test_auth_integration import _sqlite_session


def test_talent_pool_duplicate_add_returns_same_record() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        slug = "nova-hiring-pl"
        a = add_talent_pool_record(
            db, company_slug=slug, display_name="Dup Person", skills=["Py"]
        )
        b = add_talent_pool_record(
            db, company_slug=slug, display_name="Dup Person", skills=["Py"]
        )
        assert a["record"]["id"] == b["record"]["id"]
        assert b.get("duplicate") is True
    finally:
        db.close()


def test_activation_double_fetch_consistent(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        slug = "nova-hiring-pl"
        r1 = client.get("/api/v1/recruiter/activation", params={"company_slug": slug}, headers=headers)
        r2 = client.get("/api/v1/recruiter/activation", params={"company_slug": slug}, headers=headers)
        assert r1.status_code == 200
        assert r2.json() == r1.json()
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_archive_idempotent(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        out = add_talent_pool_record(
            db, company_slug="nova-hiring-pl", display_name="Archive Me", skills=["Go"]
        )
        rid = out["record"]["id"]

        def override_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_db
        client = TestClient(app)
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        r1 = client.patch(
            f"/api/v1/recruiter/talent-pool/{rid}",
            params={"company_slug": "nova-hiring-pl"},
            headers=headers,
        )
        r2 = client.patch(
            f"/api/v1/recruiter/talent-pool/{rid}",
            params={"company_slug": "nova-hiring-pl"},
            headers=headers,
        )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.json()["archived"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
