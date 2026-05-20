"""WebCal ICS feed for upcoming interviews."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.database.models import Base, ScheduledInterview, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_webcal_mint_and_download(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    u = User(email="webcal@example.com", hashed_password="x")
    db.add(u)
    db.commit()
    db.refresh(u)
    start = datetime.utcnow() + timedelta(days=2)
    end = start + timedelta(hours=1)
    inv = ScheduledInterview(
        user_id=u.id,
        company_name="Acme",
        job_title="PM",
        interview_start=start,
        interview_end=end,
        timezone="UTC",
        status="scheduled",
    )
    db.add(inv)
    db.commit()

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
        mint = client.post("/api/v1/calendar/me/webcal-token", headers={"Authorization": f"Bearer {token}"})
        assert mint.status_code == 200
        body = mint.json()
        raw = body["token"]
        assert "webcal.ics" in body["subscribe_path"]
        assert body.get("webcal_url", "").startswith("webcal://")

        dl = client.get(f"/api/v1/calendar/me/webcal.ics?token={raw}")
        assert dl.status_code == 200
        assert "text/calendar" in dl.headers.get("content-type", "")
        assert "BEGIN:VCALENDAR" in dl.text
        assert "Acme" in dl.text

        bad = client.get("/api/v1/calendar/me/webcal.ics?token=not-a-valid-token-xxxxxxxx")
        assert bad.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
