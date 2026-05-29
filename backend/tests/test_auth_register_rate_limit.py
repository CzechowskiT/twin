"""Registration mutation throttling via SlowAPI."""

from collections.abc import Iterator

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.session import get_db
from app.limiter import limiter
from app.main import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, autocommit=False, autoflush=False)()

    def override_db() -> Iterator[Session]:
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()


def _register_payload(email: str, *, consents: bool = True) -> dict[str, object]:
    return {
        "email": email,
        "password": "SafePass123!",
        "gdpr_consent": consents,
        "terms_of_service_consent": consents,
        "job_data_processing_consent": consents,
        "ai_matching_consent": consents,
        "marketing_emails_opt_in": False,
    }


def _stub_register_side_effects(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.auth.issue_verification_email", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        "app.tasks.notification_tasks.send_welcome_email_task.delay",
        lambda *_args, **_kwargs: None,
    )


def test_register_rate_limit_returns_429_after_five(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _stub_register_side_effects(monkeypatch)
    for i in range(5):
        r = client.post("/api/v1/auth/register", json=_register_payload(f"rl-register-{i}@example.com"))
        assert r.status_code == 201, r.text
    r6 = client.post("/api/v1/auth/register", json=_register_payload("rl-register-final@example.com"))
    assert r6.status_code == 429


def test_register_invalid_consent_attempts_still_hit_rate_limit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Invalid registration attempts must consume limiter budget to cap abuse."""
    _stub_register_side_effects(monkeypatch)
    for i in range(5):
        r = client.post(
            "/api/v1/auth/register",
            json=_register_payload(f"rl-register-invalid-{i}@example.com", consents=False),
        )
        assert r.status_code == 400, r.text
    r6 = client.post(
        "/api/v1/auth/register",
        json=_register_payload("rl-register-invalid-final@example.com", consents=False),
    )
    assert r6.status_code == 429
