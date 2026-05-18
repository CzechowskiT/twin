"""POST /applications/auto-apply returns 403 when account consents are incomplete."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password
from app.database.models import Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_auto_apply_http_403_without_ai_matching_consent(client: TestClient) -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    now = datetime.now(timezone.utc)
    u = User(
        email="auto403@example.com",
        hashed_password=hash_password("pw12!!pw12!!"),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=None,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    c = Candidate(user_id=u.id, name="A", skills="[]", preferred_job_titles="[]", cv_text="x" * 200)
    db.add(c)
    j = Job(
        job_board="pracuj.pl",
        external_id="e403",
        title="Dev",
        company="Co",
        url="https://ex/j",
        is_validated=True,
    )
    db.add(j)
    db.commit()
    db.refresh(j)

    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        x = User(email="auto403@example.com", hashed_password=None)
        x.id = u.id
        return x

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    token = create_access_token(u.email)
    try:
        res = client.post(
            "/api/v1/applications/auto-apply",
            headers={"Authorization": f"Bearer {token}"},
            json={"job_id": j.id, "human_acknowledged": True},
        )
        assert res.status_code == 403
        assert "zgód" in res.json()["detail"].lower() or "zgod" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        db.close()
