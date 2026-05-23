"""Integration hub — Pracuj.pl and LinkedIn Hiring connect stubs."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Base, RecruiterAtsOAuthConnection, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def hub_client() -> tuple[TestClient, Session, User]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = SessionLocal()
    user = User(email="recruiter-hub@test.local", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_db():
        try:
            yield db
        finally:
            pass

    def override_user() -> User:
        return user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    client = TestClient(app)
    yield client, db, user
    app.dependency_overrides.clear()


def test_pracuj_connect_requires_gdpr(hub_client: tuple[TestClient, Session, User]) -> None:
    client, _db, _user = hub_client
    res = client.post(
        "/api/v1/integrations/pracuj/connect",
        json={
            "integration_id": "pracuj-strefa",
            "api_key": "test-key",
            "account_id": "acme-pl",
            "gdpr_consent": False,
        },
    )
    assert res.status_code == 400
    assert "GDPR" in res.json()["detail"]


def test_pracuj_connect_saves_credentials(hub_client: tuple[TestClient, Session, User]) -> None:
    client, db, user = hub_client
    res = client.post(
        "/api/v1/integrations/pracuj/connect",
        json={
            "integration_id": "pracuj-erecruiter",
            "api_key": "erecruiter-secret",
            "account_id": "client-42",
            "gdpr_consent": True,
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "connected"
    row = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(
            RecruiterAtsOAuthConnection.user_id == user.id,
            RecruiterAtsOAuthConnection.provider == "pracuj_erecruiter",
        )
        .first()
    )
    assert row is not None
    assert row.external_account_id == "client-42"
    assert row.oauth_access_token_encrypted


def test_hub_status_lists_connections(hub_client: tuple[TestClient, Session, User]) -> None:
    client, _db, _user = hub_client
    client.post(
        "/api/v1/integrations/pracuj/connect",
        json={
            "integration_id": "pracuj-strefa",
            "api_key": "k",
            "account_id": "slug",
            "gdpr_consent": True,
        },
    )
    res = client.get("/api/v1/integrations/hub/status")
    assert res.status_code == 200
    connections = res.json()["connections"]
    assert connections["pracuj-strefa"]["status"] == "connected"


def test_linkedin_hiring_connect_stub(hub_client: tuple[TestClient, Session, User]) -> None:
    client, _db, _user = hub_client
    res = client.post(
        "/api/v1/integrations/linkedin-hiring/connect",
        json={"integration_id": "linkedin-recruiter"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "coming_soon"


@patch("app.config.get_settings")
def test_health_ops_pracuj_flag(mock_gs, hub_client: tuple[TestClient, Session, User]) -> None:
    from app.config import Settings

    client, _db, _user = hub_client
    mock_gs.return_value = Settings(pracuj_partner_api_enabled="true")
    res = client.get("/api/v1/health?ops=1")
    assert res.status_code == 200
    assert res.json()["pracuj_integration_configured"] is True
