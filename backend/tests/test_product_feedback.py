"""Product feedback and admin ops APIs."""

from fastapi.testclient import TestClient

from app.database.models import Job
from app.database.session import get_db
from app.main import create_app
from tests.test_auth_integration import _sqlite_session


def _client_with_db():
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app), db, app


def test_feedback_and_admin_flow(monkeypatch) -> None:
    monkeypatch.setenv("BETA_ADMIN_TOKEN", "ops-secret")
    monkeypatch.setenv("OPS_ADMIN_TOKEN", "ops-secret")
    from app.config import get_settings

    get_settings.cache_clear()
    client, db, app = _client_with_db()
    try:
        reg = client.post(
            "/api/v1/auth/register",
            json={
                "email": "feedback@example.com",
                "password": "SecurePass123!",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
            },
        )
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        fb = client.post(
            "/api/v1/feedback",
            headers={"Authorization": f"Bearer {token}"},
            json={"category": "ux", "rating": 4, "message": "Nice"},
        )
        assert fb.status_code == 201

        db.add(
            Job(
                job_board="pracuj",
                external_id="adm-1",
                title="Dev",
                company="Co",
                url="https://example.com/j",
                is_validated=True,
            )
        )
        db.commit()

        dq = client.get(
            "/api/v1/admin/data-quality",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert dq.status_code == 200
        assert dq.json()["total_jobs"] == 1

        metrics = client.get(
            "/api/v1/admin/metrics",
            headers={"Authorization": "Bearer ops-secret"},
        )
        assert metrics.status_code == 200
        assert metrics.json()["feedback_count"] == 1

        done = client.post(
            "/api/v1/auth/onboarding/complete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert done.status_code == 200
        assert done.json()["onboarding_completed_at"] is not None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
        get_settings.cache_clear()
