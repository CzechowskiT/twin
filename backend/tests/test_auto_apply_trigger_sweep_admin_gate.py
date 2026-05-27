"""POST /api/v1/auto-apply/trigger-sweep is gated to ops allowlist only.

Before this fix any authenticated user could call `/trigger-sweep` and
enqueue the **platform-wide** nightly auto-apply sweep (every user with
active consent), exhausting the worker budget and burning third-party
submit quotas. The gate uses the existing scrape-ops allowlist
(`SCRAPE_OPS_USER_IDS` / `SCRAPE_OPS_EMAILS`) — same primitive used to
elevate scrape triggers — so we don't add a fourth admin mechanism.

These tests freeze the contract:
- unauth → 401 (FastAPI's OAuth2PasswordBearer rejects)
- auth but not on allowlist → 403
- auth + on allowlist → 200 (sweep is invoked, but mocked here)
"""

from __future__ import annotations

from collections.abc import Iterator
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
from app.limiter import limiter
from app.main import app


def _make_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


@pytest.fixture
def sweep_client() -> Iterator[tuple[TestClient, dict[str, str], User]]:
    db = _make_session()
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
    limiter.reset()
    token = create_access_token(user.email)
    headers = {"Authorization": f"Bearer {token}"}
    try:
        with TestClient(app) as client:
            yield client, headers, user
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def test_trigger_sweep_rejects_unauthenticated(sweep_client) -> None:
    """No JWT → FastAPI's OAuth2PasswordBearer returns 401."""
    client, _headers, _user = sweep_client
    res = client.post("/api/v1/auto-apply/trigger-sweep")
    assert res.status_code == 401


def test_trigger_sweep_rejects_non_ops_user(sweep_client, monkeypatch) -> None:
    """Authenticated but not on the ops allowlist → 403, sweep not invoked."""
    client, headers, _user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", "")
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep"
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 403
    body = res.json()
    assert "allowlist" in body.get("detail", "").lower() or "ops" in body.get("detail", "").lower()
    mock_sweep.assert_not_called()
    mock_sweep.delay.assert_not_called()


def test_trigger_sweep_accepts_ops_user_via_email_allowlist(
    sweep_client, monkeypatch
) -> None:
    """Authenticated AND on the allowlist → eager sweep runs and returns."""
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    expected = {"total_users_processed": 0, "total_applications_submitted": 0}
    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value=expected,
    ) as mock_sweep:
        res = client.post("/api/v1/auto-apply/trigger-sweep", headers=headers)

    assert res.status_code == 200, res.text
    assert res.json() == expected
    mock_sweep.assert_called_once_with(dry_run=False)


def test_trigger_sweep_is_rate_limited(sweep_client, monkeypatch) -> None:
    """Even an ops user is held to 3/minute (defence-in-depth)."""
    client, headers, user = sweep_client
    monkeypatch.setenv("SCRAPE_OPS_EMAILS", user.email)
    monkeypatch.setenv("CELERY_TASK_ALWAYS_EAGER", "true")
    get_settings.cache_clear()

    with patch(
        "app.api.auto_apply_settings.nightly_auto_apply_sweep",
        return_value={"ok": True},
    ):
        codes = [
            client.post("/api/v1/auto-apply/trigger-sweep", headers=headers).status_code
            for _ in range(4)
        ]

    assert codes[:3] == [200, 200, 200], codes
    assert codes[3] == 429, codes
