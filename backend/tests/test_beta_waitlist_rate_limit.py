"""POST /api/v1/beta/join is rate-limited (defence-in-depth for public signup).

`/api/v1/beta/join` is the only candidate-side mutation that takes **no JWT
and no captcha** — anyone on the public internet can hit it. Without a rate
limit, the same IP could pollute the waitlist table and burn through the
transactional-email vendor quota. We rely on SlowAPI's per-IP sliding
window (same primitive as `/auth/login`) and freeze the contract here.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
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
def client() -> Iterator[TestClient]:
    SessionLocal = _sqlite_session_factory()

    def override_db() -> Iterator:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()


def _signup_payload(idx: int) -> dict[str, object]:
    return {
        "email": f"rate-limit-{idx}@example.com",
        "name": f"Rate Limit {idx}",
        "accept_privacy_notice": True,
        "consent_beta_email_updates": True,
        "source": "test",
        "locale": "en",
    }


def test_beta_join_rate_limit_returns_429_after_five(client: TestClient) -> None:
    """First five signups in a minute go through; the sixth is 429."""
    for i in range(5):
        r = client.post("/api/v1/beta/join", json=_signup_payload(i))
        assert r.status_code == 200, (i, r.text)

    r6 = client.post("/api/v1/beta/join", json=_signup_payload(99))
    assert r6.status_code == 429
    body = r6.json()
    detail = body.get("detail") or body.get("error") or ""
    if isinstance(detail, list):
        detail = " ".join(str(x) for x in detail)
    else:
        detail = str(detail or "")
    assert (
        "rate" in detail.lower()
        or "limit" in detail.lower()
        or "exceeded" in detail.lower()
    )
