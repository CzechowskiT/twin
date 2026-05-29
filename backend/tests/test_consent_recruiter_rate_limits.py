"""Public consent + recruiter mutation rate limits (R-011, R-012)."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.session import get_db
from app.limiter import limiter
from app.main import app

_CONSENT_BODY = {
    "version": 1,
    "analytics": False,
    "marketing": False,
    "decided_at": datetime.now(timezone.utc).isoformat(),
    "visitor_id": "visitor_rate_limit_test_01",
}


@pytest.fixture
def rl_client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()


def test_cookie_consent_rate_limit_returns_429(rl_client: TestClient) -> None:
    codes = [
        rl_client.post("/api/v1/consent/cookies", json=_CONSENT_BODY).status_code
        for _ in range(31)
    ]
    assert codes.count(200) == 30
    assert codes[-1] == 429


def test_recruiter_inbox_respond_rate_limit_returns_429(rl_client: TestClient) -> None:
    headers = {"X-Twin-Recruiter-Token": "test-recruiter-token-rate-limit"}
    body = {"action": "decline"}
    codes = [
        rl_client.post(
            "/api/v1/recruiter/inbox/1/respond",
            json=body,
            headers=headers,
        ).status_code
        for _ in range(61)
    ]
    assert 429 not in codes[:60]
    assert codes[-1] == 429


def test_recruiter_inbox_respond_batch_rate_limit_returns_429(rl_client: TestClient) -> None:
    headers = {"X-Twin-Recruiter-Token": "test-recruiter-token-rate-limit"}
    body = {"application_ids": [1], "action": "decline"}
    codes = [
        rl_client.post(
            "/api/v1/recruiter/inbox/respond-batch",
            json=body,
            headers=headers,
        ).status_code
        for _ in range(61)
    ]
    assert 429 not in codes[:60]
    assert codes[-1] == 429
