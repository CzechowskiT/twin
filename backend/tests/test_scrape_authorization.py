"""Scrape endpoint authorization (ops users only)."""

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
def scrape_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    regular = User(email="regular@test.com", hashed_password="x", is_active=True)
    ops = User(email="ops@test.com", hashed_password="x", is_active=True)
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


@patch("app.api.jobs.scrape_all_boards_task")
def test_scrape_all_forbidden_without_ops_role(mock_task, scrape_client, monkeypatch) -> None:
    client, regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", str(ops.id))
    get_settings.cache_clear()
    try:
        token = create_access_token(regular.email)
        res = client.post(
            "/api/v1/jobs/scrape/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "ops" in res.json()["detail"].lower()
        mock_task.delay.assert_not_called()
    finally:
        get_settings.cache_clear()


@patch("app.api.jobs._celery_delay")
def test_scrape_all_allowed_for_ops_user(mock_delay, scrape_client, monkeypatch) -> None:
    client, _regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", str(ops.id))
    get_settings.cache_clear()
    mock_delay.return_value = type("R", (), {"id": "task-1"})()
    try:
        token = create_access_token(ops.email)
        res = client.post(
            "/api/v1/jobs/scrape/all",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        mock_delay.assert_called_once()
    finally:
        get_settings.cache_clear()


def test_scrape_forbidden_when_ops_list_empty(scrape_client, monkeypatch) -> None:
    client, _regular, ops, _db = scrape_client
    monkeypatch.setenv("SCRAPE_OPS_USER_IDS", "")
    get_settings.cache_clear()
    try:
        token = create_access_token(ops.email)
        res = client.post(
            "/api/v1/jobs/scrape/pracuj",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
    finally:
        get_settings.cache_clear()
