"""Rate limits on public beta waitlist CV/voice uploads."""

from __future__ import annotations

import io
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, BetaWaitlist
from app.database.session import get_db
from app.limiter import limiter
from app.main import app


def _sqlite_session_factory() -> sessionmaker:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture
def client(tmp_path) -> Iterator[TestClient]:  # noqa: ANN001
    SessionLocal = _sqlite_session_factory()

    def override_db() -> Iterator:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    from app.config import Settings, get_settings

    def settings_with_tmp() -> Settings:
        s = Settings(environment="test", secret_key="x" * 32)
        s.beta_upload_dir = str(tmp_path / "beta_uploads")
        return s

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = settings_with_tmp
    limiter.reset()
    db = SessionLocal()
    db.add(
        BetaWaitlist(
            email="upload-limit@example.com",
            name="Upload Limit",
            referral_code="uploadlimit01",
            source="test",
        )
    )
    db.commit()
    db.close()
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        limiter.reset()


def _tiny_pdf() -> tuple[str, bytes, str]:
    content = b"%PDF-1.4 minimal"
    return ("cv.pdf", content, "application/pdf")


def test_beta_cv_upload_rate_limit_returns_429(client: TestClient) -> None:
    """Eleventh CV upload in a minute is rejected (10/min cap)."""
    code = "uploadlimit01"
    for _ in range(10):
        name, body, mime = _tiny_pdf()
        r = client.post(
            f"/api/v1/beta/waitlist/{code}/cv",
            files={"file": (name, io.BytesIO(body), mime)},
        )
        assert r.status_code == 200, r.text

    name, body, mime = _tiny_pdf()
    r11 = client.post(
        f"/api/v1/beta/waitlist/{code}/cv",
        files={"file": (name, io.BytesIO(body), mime)},
    )
    assert r11.status_code == 429
