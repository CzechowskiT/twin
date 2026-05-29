"""Scrape endpoint authorization (authenticated users with core consents)."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app

_NOW = datetime.now(timezone.utc)


def _user_with_consents(email: str) -> User:
    return User(
        email=email,
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=_NOW,
        terms_of_service_accepted_at=_NOW,
        job_data_processing_consent_at=_NOW,
        ai_matching_consent_at=_NOW,
    )


@pytest.fixture
def scrape_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    regular = _user_with_consents("regular@test.com")
    ops = _user_with_consents("ops@test.com")
    db.add_all([regular, ops])
    db.commit()
    db.refresh(regular)
    db.refresh(ops)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client, regular, ops, db
    app.dependency_overrides.clear()
    db.close()


@patch("app.api.jobs._celery_delay")
def test_scrape_all_allowed_for_regular_user(mock_delay, scrape_client, monkeypatch) -> None:
    client, regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_USER_TRIGGER_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", str(ops.id))
    get_settings.cache_clear()
    mock_delay.return_value = type("R", (), {"id": "task-1"})()
    try:
        token = create_access_token(regular.email)
        res = client.post(
            "/api/v1/jobs/scrape/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        mock_delay.assert_called_once()
    finally:
        get_settings.cache_clear()


def test_scrape_all_forbidden_without_core_consents(scrape_client, monkeypatch) -> None:
    client, _regular, _ops, db = scrape_client
    incomplete = User(email="nocon@test.com", hashed_password="x", is_active=True)
    db.add(incomplete)
    db.commit()
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    get_settings.cache_clear()
    try:
        token = create_access_token(incomplete.email)
        res = client.post(
            "/api/v1/jobs/scrape/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "consent" in res.json()["detail"].lower()
    finally:
        get_settings.cache_clear()


def test_scrape_forbidden_when_user_trigger_disabled(scrape_client, monkeypatch) -> None:
    client, regular, _ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_USER_TRIGGER_ENABLED", "false")
    get_settings.cache_clear()
    try:
        token = create_access_token(regular.email)
        res = client.post(
            "/api/v1/jobs/scrape/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
    finally:
        get_settings.cache_clear()


def test_scrape_allowed_when_ops_list_empty(scrape_client, monkeypatch) -> None:
    client, _regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_USER_TRIGGER_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.delenv("SCRAPE_OPS_EMAILS", raising=False)
    get_settings.cache_clear()
    try:
        token = create_access_token(ops.email)
        with patch("app.api.jobs._celery_delay") as mock_delay:
            mock_delay.return_value = type("R", (), {"id": "task-2"})()
            res = client.post(
                "/api/v1/jobs/scrape/pracuj",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert res.status_code == 200
    finally:
        get_settings.cache_clear()


@patch("app.api.jobs._celery_delay")
def test_scrape_allowed_with_or_without_ops_email(mock_delay, scrape_client, monkeypatch) -> None:
    client, regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_USER_TRIGGER_ENABLED", "true")
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", ops.email)
    get_settings.cache_clear()
    mock_delay.return_value = type("R", (), {"id": "task-3"})()
    try:
        for email in (ops.email, regular.email):
            token = create_access_token(email)
            res = client.post(
                "/api/v1/jobs/scrape/all",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 200
        assert mock_delay.call_count == 2
    finally:
        get_settings.cache_clear()
