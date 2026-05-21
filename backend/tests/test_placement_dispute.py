"""Placement dispute in-app flow."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.database.session import get_db
from app.main import create_app
from app.services.placement_verification import PLACEMENT_DECLARED, PLACEMENT_DISPUTED
from tests.test_auth_integration import _sqlite_session


def test_placement_dispute_from_declared() -> None:
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
                "email": "dispute@example.com",
                "password": "SecurePass123!",
                "gdpr_consent": True,
                "terms_of_service_consent": True,
                "job_data_processing_consent": True,
                "ai_matching_consent": True,
            },
        )
        token = reg.json()["access_token"]
        user = db.query(User).filter(User.email == "dispute@example.com").one()
        cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="d-1",
            title="Eng",
            company="Co",
            url="https://example.com/j",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
            placement_state=PLACEMENT_DECLARED,
        )
        db.add(app_row)
        db.commit()

        res = client.post(
            f"/api/v1/applications/{app_row.id}/placement-dispute",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Wrong company domain"},
        )
        assert res.status_code == 200, res.text
        db.refresh(app_row)
        assert app_row.placement_state == PLACEMENT_DISPUTED
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
