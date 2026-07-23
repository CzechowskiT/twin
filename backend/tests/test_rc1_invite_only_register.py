"""RC1 invite-only registration gate."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base
from app.database.session import get_db
from app.main import app


def _payload(email: str) -> dict:
    return {
        "email": email,
        "password": "SecurePass12!",
        "gdpr_consent": True,
        "terms_of_service_consent": True,
        "job_data_processing_consent": True,
        "ai_matching_consent": True,
    }


def _client():
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
    return TestClient(app), db


@patch("app.api.auth.get_settings")
def test_register_invite_only_blocks_unknown_email(mock_settings: MagicMock) -> None:
    s = MagicMock()
    s.external_pilot_enrollment_enabled = False
    s.pilot_registration_invite_only = True
    s.pilot_email_allowlist = "demo@twin.career"
    mock_settings.return_value = s
    client, _db = _client()
    try:
        res = client.post("/api/v1/auth/register", json=_payload("stranger@example.com"))
        assert res.status_code == 403
        assert res.json()["detail"] == "registration_invite_only"
    finally:
        app.dependency_overrides.clear()


@patch("app.api.auth.get_settings")
def test_register_invite_only_allows_allowlisted(mock_settings: MagicMock) -> None:
    s = MagicMock()
    s.external_pilot_enrollment_enabled = False
    s.pilot_registration_invite_only = True
    s.pilot_email_allowlist = "pilot.rc1@example.com"
    mock_settings.return_value = s
    client, _db = _client()
    try:
        res = client.post("/api/v1/auth/register", json=_payload("pilot.rc1@example.com"))
        assert res.status_code in (201, 409)
    finally:
        app.dependency_overrides.clear()
