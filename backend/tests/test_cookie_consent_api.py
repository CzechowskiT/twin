"""POST /api/v1/consent/cookies — append-only audit (no production DB)."""

import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, CookieConsentEvent
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_cookie_consent_anonymous_append_only(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    decided = datetime(2026, 5, 23, 12, 0, tzinfo=timezone.utc)
    try:
        res = client.post(
            "/api/v1/consent/cookies",
            json={
                "version": 1,
                "analytics": True,
                "marketing": False,
                "decided_at": decided.isoformat(),
                "visitor_id": "cv_test_visitor_01",
            },
        )
        assert res.status_code == 200
        assert res.json()["ok"] is True
        rows = db.query(CookieConsentEvent).all()
        assert len(rows) == 1
        assert rows[0].user_id is None
        assert rows[0].consent_version == 1
        choices = json.loads(rows[0].choices_json)
        assert choices["analytics"] is True
        assert choices["marketing"] is False
        assert choices["necessary"] is True
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_cookie_consent_invalid_visitor_id_422(client: TestClient) -> None:
    res = client.post(
        "/api/v1/consent/cookies",
        json={
            "version": 1,
            "analytics": False,
            "marketing": False,
            "decided_at": datetime.now(timezone.utc).isoformat(),
            "visitor_id": "short",
        },
    )
    assert res.status_code == 422
