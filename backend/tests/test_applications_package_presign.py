"""Presigned URL for stored auto-apply package PDF (owner-only)."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_auto_apply_package_url_404_without_key(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="pkg@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="T", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    db.refresh(cand)
    j = Job(
        job_board="test",
        external_id="e1",
        title="Job",
        company="Co",
        url="https://ex/1",
        is_validated=True,
        scraped_at=datetime.utcnow(),
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    app_row = Application(
        candidate_id=cand.id,
        job_id=j.id,
        status=ApplicationStatus.APPLIED,
        auto_apply_package_s3_key=None,
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="pkg@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    try:
        from app.core.security import create_access_token

        token = create_access_token(u.email)
        r = client.get(
            f"/api/v1/applications/{app_row.id}/auto-apply-package-url",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_auto_apply_package_url_returns_presigned_when_configured(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="pkg2@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    cand = Candidate(user_id=u.id, name="T", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    db.refresh(cand)
    j = Job(
        job_board="test",
        external_id="e2",
        title="Job",
        company="Co",
        url="https://ex/2",
        is_validated=True,
        scraped_at=datetime.utcnow(),
    )
    db.add(j)
    db.commit()
    db.refresh(j)
    uploaded = datetime.utcnow()
    app_row = Application(
        candidate_id=cand.id,
        job_id=j.id,
        status=ApplicationStatus.APPLIED,
        auto_apply_package_s3_key="auto_apply_packages/u1/a9.pdf",
        auto_apply_package_uploaded_at=uploaded,
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="pkg2@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    store = MagicMock()
    store.enabled = True
    store.presigned_get_url.return_value = "https://example-bucket.s3.amazonaws.com/signed"
    try:
        from app.core.security import create_access_token

        token = create_access_token(u.email)
        with patch("app.api.applications.get_s3_blob_store", return_value=store):
            r = client.get(
                f"/api/v1/applications/{app_row.id}/auto-apply-package-url",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r.status_code == 200
        body = r.json()
        assert body["url"] == "https://example-bucket.s3.amazonaws.com/signed"
        assert body["expires_in_seconds"] == 3600
        assert body["uploaded_at"] is not None
        store.presigned_get_url.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
