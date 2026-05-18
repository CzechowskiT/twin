"""PATCH /auth/me/notification-preferences (no production DB)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_notification_preferences_unauthenticated(client: TestClient) -> None:
    res = client.patch("/api/v1/auth/me/notification-preferences", json={"email_interview_reminders": True})
    assert res.status_code == 401


def test_notification_preferences_patch_updates_user(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="notif-prefs@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    assert u.email_product_updates is False
    assert u.email_interview_reminders is False

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == u.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        res = client.patch(
            "/api/v1/auth/me/notification-preferences",
            headers={"Authorization": f"Bearer {token}"},
            json={"email_product_updates": True, "email_interview_reminders": True},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["email_product_updates"] is True
        assert body["email_interview_reminders"] is True
        db.refresh(u)
        assert u.email_product_updates is True
        assert u.email_interview_reminders is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()


def test_notification_preferences_empty_body_400(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="notif-empty@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == u.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        res = client.patch(
            "/api/v1/auth/me/notification-preferences",
            headers={"Authorization": f"Bearer {token}"},
            json={},
        )
        assert res.status_code == 400
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
