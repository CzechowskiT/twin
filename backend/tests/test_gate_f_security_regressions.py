"""Security regression — Authologic, magic-link log hygiene across token types."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings, get_settings
from app.database.models import Base, User
from app.main import app
from app.services.email_verification import issue_verification_email
from app.services.password_reset import request_password_reset


def _override_settings(s: Settings):
    def _dep() -> Settings:
        return s

    app.dependency_overrides[get_settings] = _dep


def test_authologic_callback_fail_closed_without_token_in_production() -> None:
    s = Settings(
        environment="production",
        authologic_callback_token="",
        secret_key="test-secret-key-for-jwt-hs256-ok",
    )
    _override_settings(s)
    try:
        client = TestClient(app)
        res = client.get("/api/v1/kyc/authologic/callback", params={"conversation": "c1"})
        assert res.status_code == 503
        assert "token" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_settings, None)


def test_authologic_callback_rejects_bad_token_constant_time() -> None:
    s = Settings(
        environment="production",
        authologic_callback_token="expected-secret",
        authologic_api_login="login",
        authologic_api_key="key",
        secret_key="test-secret-key-for-jwt-hs256-ok",
    )
    _override_settings(s)
    try:
        client = TestClient(app)
        res = client.get(
            "/api/v1/kyc/authologic/callback",
            params={"conversation": "c1", "t": "wrong"},
        )
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(get_settings, None)


def _sqlite_user_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_password_reset_does_not_log_raw_url_outside_dev(caplog, monkeypatch) -> None:  # noqa: ANN001
    db = _sqlite_user_db()
    user = User(
        email="reset@example.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()

    settings = Settings(
        environment="production",
        debug=False,
        frontend_url="https://twin.example",
        secret_key="test-secret-key-for-jwt-hs256-ok",
    )
    monkeypatch.setattr("app.services.password_reset.is_mail_configured", lambda _s: False)

    with caplog.at_level(logging.WARNING):
        request_password_reset(db, settings, "reset@example.com")

    joined = " ".join(r.message for r in caplog.records)
    assert "reset-password?token=" not in joined
    assert "fingerprint=" in joined


def test_email_verification_does_not_log_raw_token_outside_dev(caplog, monkeypatch) -> None:  # noqa: ANN001
    db = _sqlite_user_db()
    user = User(
        email="verify@example.com",
        hashed_password="x",
        is_active=True,
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    settings = Settings(
        environment="production",
        debug=False,
        frontend_url="https://twin.example",
        secret_key="test-secret-key-for-jwt-hs256-ok",
    )
    monkeypatch.setattr("app.services.email_verification.is_mail_configured", lambda _s: False)
    with caplog.at_level(logging.WARNING):
        issue_verification_email(db, settings, user)
    joined = " ".join(r.message for r in caplog.records)
    assert "verify-email?token=" not in joined
    assert "fingerprint=" in joined
