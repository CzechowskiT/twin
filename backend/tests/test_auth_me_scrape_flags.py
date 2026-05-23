"""GET /auth/me scrape capability flags."""

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


@pytest.fixture
def me_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    user = User(
        email="ops@test.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=_NOW,
        terms_of_service_accepted_at=_NOW,
        job_data_processing_consent_at=_NOW,
        ai_matching_consent_at=_NOW,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client, user, db
    app.dependency_overrides.clear()
    db.close()


def test_auth_me_scrape_flags_when_email_allowlisted(me_client, monkeypatch) -> None:
    client, user, _db = me_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()
    try:
        token = create_access_token(user.email)
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["scrape_ops_configured"] is True
        assert body["scrape_ops_elevated"] is True
        assert body["can_trigger_scrape"] is True
        assert body["scrape_worker_ready"] is True
    finally:
        get_settings.cache_clear()


def test_auth_me_can_trigger_scrape_without_ops_allowlist(me_client, monkeypatch) -> None:
    client, user, _db = me_client
    monkeypatch.delenv("SCRAPE_OPS_EMAILS", raising=False)
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()
    try:
        token = create_access_token(user.email)
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["scrape_ops_configured"] is False
        assert body["scrape_ops_elevated"] is False
        assert body["can_trigger_scrape"] is True
        assert body["scrape_worker_ready"] is True
        assert body["mail_configured"] is False
        assert body["microsoft_calendar_oauth_configured"] is False
    finally:
        get_settings.cache_clear()


@patch("app.api.auth.is_microsoft_calendar_oauth_configured", return_value=True)
@patch("app.api.auth.is_mail_configured", return_value=True)
def test_auth_me_includes_mail_and_calendar_ops_flags(
    _mock_mail: object,
    _mock_ms: object,
    me_client,
    monkeypatch,
) -> None:
    client, user, _db = me_client
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("MAIL_FROM", "TWIN <test@resend.dev>")
    get_settings.cache_clear()
    try:
        token = create_access_token(user.email)
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["mail_configured"] is True
        assert body["microsoft_calendar_oauth_configured"] is True
    finally:
        get_settings.cache_clear()
