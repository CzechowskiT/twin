"""Public MVP traction stats."""

import logging
from datetime import datetime
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app, create_app


def _sqlite():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_public_mvp_stats_shape_empty() -> None:
    db = _sqlite()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 200
        body = res.json()
        assert body["validated_jobs"] == 0
        assert body["registered_users"] == 0
        assert body["total_applications"] == 0
        assert body["profiles_with_cv"] == 0
        assert body["job_boards_in_registry"] >= 1
        assert "generated_at" in body
        assert body["generated_at"].endswith("Z")
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


@patch("app.api.public.get_settings")
def test_public_mvp_stats_investor_demo_mode(mock_get_settings) -> None:
    """Optional deck mode: headline jobs counter without changing other aggregates."""
    db = _sqlite()
    mock_s = MagicMock()
    mock_s.investor_mvp_stats_demo_mode = True
    mock_s.investor_mvp_stats_demo_validated_jobs = 100_000
    mock_s.linkedin_client_id = ""
    mock_s.linkedin_client_secret = ""
    mock_s.stripe_secret_key = ""
    mock_s.stripe_price_id_premium = ""
    mock_get_settings.return_value = mock_s

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 200
        body = res.json()
        assert body["validated_jobs"] == 100_000
        assert body["registered_users"] == 0
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_public_mvp_stats_counts() -> None:
    db = _sqlite()
    u = User(email="stats@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="A", skills="[]", preferred_job_titles="[]", cv_uploaded_at=None)
    db.add(cand)
    db.commit()
    db.refresh(cand)
    j = Job(
        job_board="test",
        external_id="e1",
        title="T",
        company="C",
        url="https://ex/1",
        is_validated=True,
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    db.add(Application(candidate_id=cand.id, job_id=j.id, status=ApplicationStatus.PENDING))
    cand.cv_uploaded_at = datetime.utcnow()
    db.add(cand)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 200
        body = res.json()
        assert body["validated_jobs"] == 1
        assert body["registered_users"] == 1
        assert body["total_applications"] == 1
        assert body["profiles_with_cv"] == 1
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


@patch("app.api.public.scrape_board_ids_ordered", side_effect=RuntimeError("registry-boom-secret"))
def test_public_mvp_stats_500_is_generic_and_logs_exception(mock_scrape: object, caplog) -> None:
    caplog.set_level(logging.ERROR, logger="app.api.public")
    db = _sqlite()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.get("/api/v1/public/mvp-stats")
        assert res.status_code == 500
        assert res.json() == {"detail": "Internal server error"}
        assert "registry-boom" not in res.text
        assert "registry-boom-secret" in caplog.text
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_http_500_http_exception_detail_sanitized() -> None:
    """Global handler must not echo arbitrary HTTPException(500) detail to clients."""
    probe_app = create_app()

    @probe_app.get("/__probe_http500")
    def _probe_http500() -> None:
        raise HTTPException(status_code=500, detail="internal-db-secret-leak")

    client = TestClient(probe_app)
    res = client.get("/__probe_http500")
    assert res.status_code == 500
    assert res.json() == {"detail": "Internal server error"}
    assert "internal-db-secret" not in res.text
