"""Unified upcoming interviews feed."""

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.database.models import ScheduledInterview, User
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def test_me_interviews_lists_upcoming() -> None:
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
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "cal-me@example.com",
                "password": "SecurePass123!",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
            },
        )
        token = reg.json()["access_token"]
        user = db.query(User).filter(User.email == "cal-me@example.com").one()
        start = datetime.utcnow() + timedelta(days=2)
        db.add(
            ScheduledInterview(
                user_id=user.id,
                company_name="Acme",
                job_title="Eng",
                interview_start=start,
                interview_end=start + timedelta(hours=1),
                calendar_provider="microsoft",
            )
        )
        db.commit()

        res = client.get(
            "/api/v1/calendar/me/interviews",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        rows = res.json()
        assert len(rows) == 1
        assert rows[0]["calendar_provider"] == "microsoft"
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
