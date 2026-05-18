"""KYC / Authologic wiring (no live Authologic calls)."""

from datetime import datetime
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app
from app.services import kyc_service


def test_identity_passed_requires_finished_states() -> None:
    assert not kyc_service.identity_passed_from_conversation({"status": "IN_PROGRESS"})
    assert not kyc_service.identity_passed_from_conversation(
        {"status": "FINISHED", "result": {"identity": {"status": "IN_PROGRESS"}}}
    )
    assert kyc_service.identity_passed_from_conversation(
        {"status": "FINISHED", "result": {"identity": {"status": "FINISHED"}}}
    )


def _sqlite_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_kyc_start_persists_conversation(monkeypatch) -> None:
    db = _sqlite_session()
    user = User(
        email="kyc@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime(2024, 1, 1),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        monkeypatch.setenv("AUTHOLOGIC_API_LOGIN", "demo-login")
        monkeypatch.setenv("AUTHOLOGIC_API_KEY", "demo-key")
        monkeypatch.setenv("AUTHOLOGIC_STRATEGY", "public:default")
        monkeypatch.setenv("AUTHOLOGIC_API_BASE_URL", "https://sandbox.authologic.com")

        from app.config import get_settings

        get_settings.cache_clear()

        fake = {
            "id": "conv-test-uuid-1",
            "userKey": kyc_service.stable_authologic_user_key(user),
            "url": "https://sandbox.authologic.com/c/conv-test-uuid-1",
            "status": "CREATED",
            "result": {"identity": {"status": "IN_PROGRESS", "user": {}}},
        }
        with patch("app.services.kyc_service.authologic_client.create_conversation", return_value=fake):
            token = create_access_token(user.email)
            client = TestClient(app)
            res = client.post(
                "/api/v1/kyc/authologic/start",
                headers={"Authorization": f"Bearer {token}"},
                json={"identity_provider_processing_consent": True},
            )
        assert res.status_code == 200
        body = res.json()
        assert body["conversation_id"] == "conv-test-uuid-1"
        assert "sandbox.authologic.com" in body["redirect_url"]
    finally:
        app.dependency_overrides.clear()
        from app.config import get_settings

        get_settings.cache_clear()


def test_kyc_callback_rejects_bad_token(monkeypatch) -> None:
    monkeypatch.setenv("AUTHOLOGIC_CALLBACK_TOKEN", "secret-cb")
    monkeypatch.setenv("AUTHOLOGIC_API_LOGIN", "demo-login")
    monkeypatch.setenv("AUTHOLOGIC_API_KEY", "demo-key")
    monkeypatch.setenv("AUTHOLOGIC_STRATEGY", "public:default")

    from app.config import get_settings

    get_settings.cache_clear()
    try:
        client = TestClient(app)
        res = client.get("/api/v1/kyc/authologic/callback?conversation=x")
        assert res.status_code == 403
    finally:
        get_settings.cache_clear()
