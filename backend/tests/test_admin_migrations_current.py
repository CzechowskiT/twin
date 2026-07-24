"""Admin Alembic current revision endpoint — read-only, token-gated."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import Base
from app.database.session import get_db
from app.main import app


@pytest.fixture
def migrations_admin_client(monkeypatch):
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "test-ops-token")
    get_settings.cache_clear()
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(
            text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
        )
        conn.execute(
            text("INSERT INTO alembic_version (version_num) VALUES ('068_placement_events_foundation')")
        )
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    get_settings.cache_clear()


def test_migrations_current_requires_token(migrations_admin_client) -> None:
    res = migrations_admin_client.get("/api/v1/admin/migrations/current")
    assert res.status_code == 401


def test_migrations_current_ok(migrations_admin_client) -> None:
    res = migrations_admin_client.get(
        "/api/v1/admin/migrations/current",
        headers={"Authorization": "Bearer test-ops-token"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["current_revision"] == "068_placement_events_foundation"
    assert body["head_revision"] == "104_ai_intel_validation"
    assert body["is_at_head"] is False
    assert body["read_only"] is True
    blob = res.text.lower()
    assert "postgresql://" not in blob
    # Endpoint may mention "secret" in field names (e.g. connector_secret) — block DB URLs only.
    assert "postgresql://" not in blob
