"""Lightweight integration-style auth flow (SQLite + dependency overrides)."""

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, User
from app.database.session import get_db
from app.main import app


def _sqlite_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_register_then_me_then_login_json() -> None:
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        email = "integration-auth@example.com"
        password = "securepass1"
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
            },
        )
        assert reg.status_code == 201, reg.text
        token = reg.json()["access_token"]
        assert isinstance(token, str) and len(token) > 10

        me = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me.status_code == 200
        assert me.json()["email"] == email

        bad = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"})
        assert bad.status_code == 401

        login = client.post(
            "/api/v1/auth/login/json",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200
        assert login.json().get("access_token")

        row = db.query(User).filter(User.email == email).one()
        assert row.gdpr_consent_at is not None
        assert row.terms_of_service_accepted_at is not None
        assert isinstance(row.created_at, datetime) or row.created_at is None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
