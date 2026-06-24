"""Microsoft Graph busy-read readiness contract — no tokens, no live Graph."""

import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app
from app.services.microsoft_busy_read import FORBIDDEN_SCOPES, REQUIRED_SCOPES

FORBIDDEN_RESPONSE_SUBSTRINGS = (
    "refresh_token",
    "access_token",
    "postgresql://",
    "SECRET_KEY",
    "Traceback (most recent call last)",
)


@pytest.fixture
def busy_read_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(email="busy-read@test.com", hashed_password="x", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(app)
    yield client, headers, db, user
    app.dependency_overrides.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_busy_read_readiness_unauthenticated(client: TestClient) -> None:
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness")
    assert res.status_code == 401


def test_busy_read_readiness_contract_shape(busy_read_client) -> None:
    client, headers, _db, _user = busy_read_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "microsoft"
    assert body["capability"] == "busy_read"
    assert body["required_scopes"] == list(REQUIRED_SCOPES)
    assert body["forbidden_scopes"] == list(FORBIDDEN_SCOPES)
    assert "Calendars.Read" in body["required_scopes"]
    assert "Calendars.ReadWrite" in body["forbidden_scopes"]
    assert body["busy_read_status"] == "demo_busy_slots_available"
    assert body["source"] == "demo"
    assert isinstance(body["blocked_capabilities"], list)
    assert len(body["blocked_capabilities"]) >= 5
    assert "public_health_microsoft_configured" in body
    assert "oauth_connection_state" in body


def test_busy_read_readiness_never_leaks_secrets(busy_read_client) -> None:
    client, headers, _db, _user = busy_read_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness", headers=headers)
    raw = json.dumps(res.json()).lower()
    for forbidden in FORBIDDEN_RESPONSE_SUBSTRINGS:
        assert forbidden.lower() not in raw, forbidden
    keys = {k.lower() for k in res.json().keys()}
    assert "token" not in keys
    assert "refresh" not in keys
