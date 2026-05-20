"""GET /auth/me scrape capability flags."""

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
    user = User(email="ops@test.com", hashed_password="x", is_active=True)
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
    get_settings.cache_clear()
    try:
        token = create_access_token(user.email)
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["scrape_ops_configured"] is True
        assert body["can_trigger_scrape"] is True
    finally:
        get_settings.cache_clear()


def test_auth_me_scrape_flags_when_unconfigured(me_client, monkeypatch) -> None:
    client, user, _db = me_client
    monkeypatch.delenv("SCRAPE_OPS_EMAILS", raising=False)
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    get_settings.cache_clear()
    try:
        token = create_access_token(user.email)
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        body = res.json()
        assert body["scrape_ops_configured"] is False
        assert body["can_trigger_scrape"] is False
    finally:
        get_settings.cache_clear()
