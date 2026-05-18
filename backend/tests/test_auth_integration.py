"""Auth integration checks (SQLite + dependency overrides)."""

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Base, User
from app.database.session import get_db
from app.limiter import limiter
from app.main import create_app


def _sqlite_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_register_login_me_flow() -> None:
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        email = "auth-int-test@example.com"
        password = "SecurePass123!"
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

        login = client.post(
            "/api/v1/auth/login/json",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200, login.text
        assert "access_token" in login.json()

        token = login.json()["access_token"]
        me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == email

        row = db.query(User).filter(User.email == email).one()
        assert row.gdpr_consent_at is not None
        assert isinstance(row.created_at, datetime) or row.created_at is None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_rate_limiting_login_json() -> None:
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    limiter.reset()
    try:
        client = TestClient(app)
        email = "rate-auth@example.com"
        password = "SecurePass123!"
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

        for i in range(6):
            res = client.post(
                "/api/v1/auth/login/json",
                json={"email": email, "password": "wrong-password"},
            )
            if i < 5:
                assert res.status_code == 401, res.text
            else:
                assert res.status_code == 429, res.text
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter.reset()
        db.close()
