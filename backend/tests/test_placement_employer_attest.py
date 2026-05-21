"""Employer one-click placement attestation."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.database.session import get_db
from app.main import create_app
from app.services.placement_verification import PLACEMENT_DECLARED
from tests.test_auth_integration import _sqlite_session


def test_employer_attest_flow() -> None:
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
        email = "emp-flow@example.com"
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
            },
        )
        assert reg.status_code == 201
        token = reg.json()["access_token"]
        me_user = db.query(User).filter(User.email == email).one()
        cand = Candidate(user_id=me_user.id, name="C", skills="[]", preferred_job_titles="[]")
        db.add(cand)
        job = Job(
            job_board="pracuj",
            external_id="ea-2",
            title="Eng",
            company="Co",
            url="https://example.com/j2",
            is_validated=True,
        )
        db.add(job)
        db.flush()
        app_row = Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.INTERVIEW,
            placement_state=PLACEMENT_DECLARED,
            placement_reported_at=datetime.now(timezone.utc),
        )
        db.add(app_row)
        db.commit()

        link = client.post(
            f"/api/v1/applications/{app_row.id}/placement-employer-attest-link",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert link.status_code == 200, link.text
        attest_url = link.json()["attest_url"]
        raw = attest_url.split("token=")[-1]

        confirm = client.post(
            "/api/v1/placement/employer/confirm",
            json={"token": raw},
        )
        assert confirm.status_code == 200, confirm.text
        db.refresh(app_row)
        assert app_row.placement_state == "verified"
        assert app_row.placement_verified_at is not None
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
