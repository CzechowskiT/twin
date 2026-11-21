"""First candidate session, using normal API routes and isolated job inventory."""

from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import pytest

from app.database.models import (
    ActivationMatchingJob, Candidate, CandidatePilotAllowlist, CandidatePilotCohort,
    Job, JobMatch, ProductFunnelEvent, User,
)
from app.services.candidate_invite_tokens import hash_email
from tests.test_activation_ttv import _client_with_db, _register


@pytest.fixture
def pilot(monkeypatch, tmp_path):
    monkeypatch.setenv("CV_UPLOAD_DIR", str(tmp_path))
    monkeypatch.setenv("PILOT_REGISTRATION_INVITE_ONLY", "true")
    monkeypatch.setenv("EXTERNAL_PILOT_ENROLLMENT_ENABLED", "false")
    client, db, app, get_settings = _client_with_db(monkeypatch)
    email = "candidate-first@example.com"
    cohort = CandidatePilotCohort(slug="fixture", display_name="Test", status="FOUNDER_APPROVED")
    db.add(cohort)
    db.flush()
    invite = CandidatePilotAllowlist(
        cohort_id=cohort.id, email_hash=hash_email(email), email_masked="c***@example.com"
    )
    db.add(invite)
    db.commit()
    with (
        patch("app.services.email_verification.is_mail_configured", return_value=True),
        patch("app.services.email_verification.send_email_verification_email") as local_mail,
    ):
        token = _register(client, email)
    verification = parse_qs(urlsplit(local_mail.call_args.kwargs["verify_url"]).query)["token"][0]
    try:
        yield client, db, {"Authorization": f"Bearer {token}"}, verification, invite, cohort
    finally:
        app.dependency_overrides.clear()
        db.close()
        get_settings.cache_clear()


def _insert_job(db, title, skill, *, validated=True, age=0):
    job = Job(
        title=title, description=skill, requirements=skill, company=title,
        location="Warsaw", salary_min=12000, salary_max=20000, is_validated=validated,
        job_board="fixture", external_id=title, url="https://example.com/" + title.replace(" ", "-"),
        scraped_at=datetime.utcnow() - timedelta(days=age),
    )
    db.add(job)
    db.commit()
    return job.id


@pytest.mark.parametrize("profile_first", [False, True])
def test_new_free_pilot_profile_and_first_match(pilot, profile_first):
    client, db, auth, verification, _, _ = pilot
    profile = {"name": "Tester", "skills": ["Python"], "preferred_job_titles": ["Senior Backend Engineer"],
               "location": "Warsaw", "experience_years": 6, "desired_salary": 15000}
    relevant = _insert_job(db, "Senior Backend Engineer", "Python")
    _insert_job(db, "Senior Accountant", "Financial accounting")
    _insert_job(db, "Archived Backend Engineer", "Python", age=100)
    _insert_job(db, "Unvalidated Backend Engineer", "Python", validated=False)
    assert client.post("/api/v1/auth/verify-email", json={"token": verification}).status_code == 200
    if not profile_first:
        assert client.post("/api/v1/auth/onboarding/complete", headers=auth).is_success
    saved = client.put("/api/v1/candidates/me", json=profile, headers=auth)
    assert saved.is_success and saved.json()["matching_profile_complete"]
    if profile_first:
        assert db.query(ActivationMatchingJob).count() == 0
        assert client.post("/api/v1/auth/onboarding/complete", headers=auth).is_success
    assert client.put("/api/v1/candidates/me", json=profile, headers=auth).is_success
    assert db.query(ActivationMatchingJob).one().match_count == 1
    status = client.get("/api/v1/candidates/me/activation-status", headers=auth).json()
    assert status["ux_state"] == "matches_ready"
    feed = client.get("/api/v1/candidates/me/matches", headers=auth)
    assert [row["job_id"] for row in feed.json()["items"]] == [relevant]
    assert feed.json()["items"][0]["match_reason"]
    assert db.query(ProductFunnelEvent).filter_by(event_name="first_match").count() == 1
    assert db.query(User).one().stripe_subscription_id is None


def test_irrelevant_feed_stays_empty(pilot):
    client, db, auth, verification, _, _ = pilot
    _insert_job(db, "Senior Accountant", "Accounting")
    assert client.post("/api/v1/auth/verify-email", json={"token": verification}).is_success
    profile = {"name": "Tester", "skills": ["Woodworking"], "preferred_job_titles": ["Senior Carpenter"],
               "location": "Warsaw", "experience_years": 8, "desired_salary": 15000}
    assert client.put("/api/v1/candidates/me", json=profile, headers=auth).is_success
    assert client.post("/api/v1/auth/onboarding/complete", headers=auth).is_success
    feed = client.get("/api/v1/candidates/me/matches?min_score=0", headers=auth)
    assert feed.json()["items"] == []
    assert db.query(JobMatch).count() == 0
    assert db.query(ProductFunnelEvent).filter_by(event_name="first_match").count() == 0
    _insert_job(db, "Python Developer", "Python")
    profile.update(skills=["Python"], preferred_job_titles=["Backend Engineer"])
    assert client.put("/api/v1/candidates/me", json=profile, headers=auth).is_success
    assert [j.match_count for j in db.query(ActivationMatchingJob).order_by(ActivationMatchingJob.id)] == [0, 1]


def test_pilot_profile_permission_is_scoped_and_revocable(pilot):
    client, db, auth, verification, invite, cohort = pilot
    path = "/api/v1/candidates/me"
    payload = {"name": "Tester", "skills": ["Python"], "experience_years": 1, "location": "Warsaw"}
    assert client.put(path, headers=auth, json=payload).status_code == 403
    assert client.post("/api/v1/auth/verify-email", json={"token": verification}).is_success
    assert client.put(path, headers=auth, json=payload).is_success
    cv_text = b"Python backend engineer with five years of experience designing web services and maintaining SQL databases."
    cv = {"file": ("resume.txt", cv_text, "text/plain")}
    assert client.post(path + "/cv", files=cv, headers=auth).status_code == 403
    with (
        patch("app.services.cv_enrichment.is_anthropic_configured", return_value=True),
        patch("app.services.cv_enrichment._enrich_with_claude") as paid_cv,
        patch("app.services.candidate_intelligence.enqueue_intelligence_for_candidate") as queued_ai,
        patch("app.api.profile_import.synthesize_profile_with_ai") as paid_import,
    ):
        uploaded = client.post(path + "/cv", files=cv, data={"processing_consent": "true"}, headers=auth)
        assert uploaded.is_success and uploaded.json()["matching_profile_complete"]
        imported = client.post("/api/v1/profile/import-cv-text", json={"cv_text": cv_text.decode()}, headers=auth)
        assert imported.is_success
        paid_cv.assert_not_called()
        paid_import.assert_not_called()
        queued_ai.assert_not_called()
    assert db.query(Candidate).one().cv_filename == "resume.txt"
    invite.active = False
    db.commit()
    assert client.put(path, headers=auth, json=payload).status_code == 403
    assert client.post(path + "/cv", files=cv, headers=auth).status_code == 403
    invite.active = True
    cohort.status = "PAUSED"
    db.commit()
    assert client.put(path, headers=auth, json=payload).status_code == 403
    cohort.status = "ACTIVE"
    user = db.query(User).one()
    user.subscription_status = "active"
    user.plan_tier = "standby"
    db.commit()
    assert client.put(path, headers=auth, json=payload).status_code == 403
