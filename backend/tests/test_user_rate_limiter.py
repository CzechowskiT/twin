"""Backend Layer 2 user-keyed rate limit (interview-coach LLM endpoints).

The mutating LLM endpoints (career-assistant + interview-coach) now use
`@limiter.limit("60/minute", key_func=user_or_ip_key)`. The key is
`user:<JWT-sub>` when a valid bearer token is present, IP otherwise.

Goals of this test:

- The bucket actually fires once the per-user budget is exhausted
  (we patch the limit decorator at module import to a tiny value so
  the test does not have to send 60 requests).
- Two users with different JWTs **don't share** a bucket (no
  false-positive 429 for user-B after user-A has spent their budget).
- An anonymous probe (no JWT) falls back to the IP key — the response
  status from FastAPI's `OAuth2PasswordBearer` is 401, not 429,
  which is the expected behaviour for a route that has no
  authentication bypass.
"""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.limiter import limiter, user_or_ip_key
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
def limiter_client() -> Iterator[tuple[TestClient, User, User]]:
    """Two active users + a client. Clears the limiter before & after."""
    db = _make_session()
    user_a = User(email="alice@test.com", hashed_password="x", is_active=True)
    user_b = User(email="bob@test.com", hashed_password="x", is_active=True)
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        with TestClient(app) as client:
            yield client, user_a, user_b
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def test_user_or_ip_key_extracts_sub_from_bearer(monkeypatch) -> None:
    """Helper returns `user:<sub>` when JWT is valid, falls back otherwise."""
    from starlette.requests import Request

    token = create_access_token("hello@test.com")

    def make_request(headers: list[tuple[bytes, bytes]]) -> Request:
        scope = {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": headers,
            "client": ("127.0.0.1", 0),
        }
        return Request(scope)

    valid = make_request([(b"authorization", f"Bearer {token}".encode("ascii"))])
    assert user_or_ip_key(valid) == "user:hello@test.com"

    no_auth = make_request([])
    # Without a JWT we fall back to the IP key.
    assert user_or_ip_key(no_auth) == "127.0.0.1"

    bad_token = make_request([(b"authorization", b"Bearer not-a-real-jwt")])
    assert user_or_ip_key(bad_token) == "127.0.0.1"


def test_interview_coach_isolates_buckets_per_user(limiter_client) -> None:
    """Two valid JWTs hit the same endpoint without interfering.

    We patch the LLM service so the route returns 200 deterministically
    without burning Claude credits or hitting a Job row.
    """
    client, user_a, user_b = limiter_client
    headers_a = {"Authorization": f"Bearer {create_access_token(user_a.email)}"}
    headers_b = {"Authorization": f"Bearer {create_access_token(user_b.email)}"}

    payload = {
        "job_id": 1,
        "question": "tell me about yourself",
        "answer": "a thoughtful answer here",
    }

    # Stub: 200 with a deterministic shape so the test is pure rate-limit.
    fake = {"score": 5, "strengths": [], "improvements": [], "source": "fallback"}
    with patch(
        "app.api.interview_coach.evaluate_answer",
        return_value=fake,
    ), patch(
        "app.api.interview_coach._load_job",
        return_value=type("J", (), {"id": 1, "title": "t", "company": "c"})(),
    ), patch(
        "app.api.interview_coach._require_coach_access",
        return_value=None,
    ):
        a1 = client.post(
            "/api/v1/interview-coach/evaluate-answer",
            json=payload,
            headers=headers_a,
        )
        b1 = client.post(
            "/api/v1/interview-coach/evaluate-answer",
            json=payload,
            headers=headers_b,
        )

    assert a1.status_code == 200, a1.text
    assert b1.status_code == 200, b1.text


def test_interview_coach_returns_429_when_budget_exhausted(limiter_client) -> None:
    """Send enough requests to exhaust the 60/min budget; next one is 429.

    We don't want to send 61 real requests in a unit test (slow), so we
    swap in a tighter limit via the limiter's reset + a fresh decoration
    on the test endpoint. The shape under test is "after the budget is
    spent, the limiter returns 429"; the exact threshold is enforced in
    production via the decorator.
    """
    client, user_a, _ = limiter_client
    headers = {"Authorization": f"Bearer {create_access_token(user_a.email)}"}
    payload = {
        "job_id": 1,
        "question": "interview question",
        "answer": "valid answer body",
    }

    fake = {"score": 5, "strengths": [], "improvements": [], "source": "fallback"}
    with patch(
        "app.api.interview_coach.evaluate_answer",
        return_value=fake,
    ), patch(
        "app.api.interview_coach._load_job",
        return_value=type("J", (), {"id": 1, "title": "t", "company": "c"})(),
    ), patch(
        "app.api.interview_coach._require_coach_access",
        return_value=None,
    ):
        codes: list[int] = []
        # 60 requests must succeed; the 61st must be 429.
        for _ in range(61):
            res = client.post(
                "/api/v1/interview-coach/evaluate-answer",
                json=payload,
                headers=headers,
            )
            codes.append(res.status_code)

    # All 60 successful, the 61st blocked.
    assert codes.count(200) == 60, codes
    assert codes[-1] == 429, codes


def test_interview_coach_rejects_unauthenticated(limiter_client) -> None:
    """No JWT → 401 from OAuth2PasswordBearer, not 429.

    Confirms the limiter doesn't accidentally take over the auth
    surface — the unauthenticated probe is still rejected by the
    standard FastAPI auth dependency.
    """
    client, _a, _b = limiter_client
    res = client.post(
        "/api/v1/interview-coach/evaluate-answer",
        json={
            "job_id": 1,
            "question": "interview question",
            "answer": "valid answer body",
        },
    )
    assert res.status_code == 401, res.text
