"""Microsoft busy-read readiness contract hardening — all safety flags exposed."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app

SAFETY_FLAG_KEYS = (
    "product_gate_enabled",
    "oauth_connect_gate_enabled",
    "calendar_write_gate_enabled",
    "public_health_microsoft_configured",
)


@pytest.fixture(autouse=True)
def _clear_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MICROSOFT_BUSY_READ_ENABLED", raising=False)
    monkeypatch.delenv("MICROSOFT_OAUTH_CONNECT_GATE_ENABLED", raising=False)
    monkeypatch.delenv("MICROSOFT_CALENDAR_WRITE_ENABLED", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def contract_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    user = User(email="busy-read-contract@test.com", hashed_password="x", is_active=True)
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
    yield client, headers
    app.dependency_overrides.clear()


def test_readiness_exposes_all_safety_flags_false_by_default(contract_client) -> None:
    client, headers = contract_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    for key in SAFETY_FLAG_KEYS:
        assert key in body, key
        assert body[key] is False


def test_preview_exposes_all_safety_flags_false_by_default(contract_client) -> None:
    client, headers = contract_client
    res = client.get("/api/v1/calendar/microsoft/busy-read/preview", headers=headers)
    assert res.status_code == 200
    body = res.json()
    for key in SAFETY_FLAG_KEYS:
        assert key in body, key
        assert body[key] is False
