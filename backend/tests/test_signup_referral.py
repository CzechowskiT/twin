"""Signup referral note storage and active-user resolution by email-shaped note."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app


def _sqlite_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_register_sets_referrer_when_note_is_active_user_email() -> None:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    ref = User(
        email="referrer@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=True,
    )
    db.add(ref)
    db.commit()
    db.refresh(ref)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newbie@example.com",
                "password": "password12",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
                "referred_by_note": "  Referrer@Example.com ",
            },
        )
        assert res.status_code == 201, res.text
        newbie = db.query(User).filter(User.email == "newbie@example.com").one()
        assert newbie.signup_referred_by_note == "Referrer@Example.com"
        assert newbie.signup_referrer_user_id == ref.id
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_register_no_referrer_when_inactive() -> None:
    db = _sqlite_db()
    now = datetime.now(timezone.utc)
    ref = User(
        email="sleeping@example.com",
        hashed_password=hash_password("password12"),
        gdpr_consent_at=now,
        is_active=False,
    )
    db.add(ref)
    db.commit()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "other@example.com",
                "password": "password12",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
                "referred_by_note": "sleeping@example.com",
            },
        )
        assert res.status_code == 201
        newbie = db.query(User).filter(User.email == "other@example.com").one()
        assert newbie.signup_referred_by_note == "sleeping@example.com"
        assert newbie.signup_referrer_user_id is None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_register_free_text_note_without_email_match() -> None:
    db = _sqlite_db()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        res = client.post(
            "/api/v1/auth/register",
            json={
                "email": "solo@example.com",
                "password": "password12",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
                "marketing_emails_opt_in": False,
                "referred_by_note": "Kasia z meetupa",
            },
        )
        assert res.status_code == 201
        u = db.query(User).filter(User.email == "solo@example.com").one()
        assert u.signup_referred_by_note == "Kasia z meetupa"
        assert u.signup_referrer_user_id is None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
