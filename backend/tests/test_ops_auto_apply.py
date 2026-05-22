"""Ops auto-apply last-run endpoint."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database.models import AutoApplyRun, Base
from app.database.session import get_db
from app.main import app


class _OpsSettings:
    ops_admin_token = "test-ops-token"
    beta_admin_token = ""


def test_ops_last_run_requires_token() -> None:
    app.dependency_overrides[get_settings] = lambda: _OpsSettings()
    try:
        client = TestClient(app)
        res = client.get("/api/v1/ops/auto-apply/last-run")
        assert res.status_code == 401
    finally:
        app.dependency_overrides.pop(get_settings, None)


def test_ops_last_run_returns_latest() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    now = datetime.now(timezone.utc)
    db.add(
        AutoApplyRun(
            started_at=now,
            finished_at=now,
            total_users_processed=3,
            total_applications_submitted=5,
            total_applications_failed=1,
        )
    )
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = lambda: _OpsSettings()
    try:
        client = TestClient(app)
        res = client.get(
            "/api/v1/ops/auto-apply/last-run",
            headers={"Authorization": "Bearer test-ops-token"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["total_applications_submitted"] == 5
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_settings, None)
        db.close()
