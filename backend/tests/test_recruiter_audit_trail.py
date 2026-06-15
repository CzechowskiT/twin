from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_audit_trail import (
    ALLOWED_META_KEYS,
    RECRUITER_AUDIT_ACTION_TYPES,
    list_recruiter_audit_events,
    log_recruiter_audit_event,
)
from app.services.recruiter_inbox import respond_recruiter_batch
from tests.test_auth_integration import _sqlite_session


@pytest.fixture
def recruiter_api_client() -> Iterator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.pop(get_db, None)


def _seed_application(db) -> tuple[Application, str]:
    user = User(
        email="audit@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Secret Name", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    job = Job(
        job_board="pracuj",
        external_id="audit-j1",
        title="Engineer",
        company="Audit Co",
        url="https://example.com/j",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(app_row)
    db.commit()
    return app_row, "audit-co"


def test_sanitize_meta_strips_pii_and_decline_note() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        out = log_recruiter_audit_event(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="review_opened",
            meta={
                "source": "review_card",
                "decline_note": "secret",
                "candidate_name": "Secret Name",
                "status_before": "applied",
                "unexpected": "drop",
            },
        )
        assert out["meta"] == {"source": "review_card", "status_before": "applied"}
        assert set(out["meta"].keys()) <= ALLOWED_META_KEYS
    finally:
        db.close()


def test_respond_accept_logs_decision_accept() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        respond_recruiter_batch(db, company_slug=slug, application_id=app_row.id, action="accept")
        events = list_recruiter_audit_events(db, application_id=app_row.id, company_slug=slug)
        assert len(events["items"]) == 1
        event = events["items"][0]
        assert event["action_type"] == "decision_accept"
        assert event["meta"]["status_after"] == "interview"
        assert "decline_note" not in event["meta"]
    finally:
        db.close()


def test_recruiter_audit_api_list_and_post(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    override = app.dependency_overrides[get_db]
    db = next(override())
    try:
        app_row, slug = _seed_application(db)
        headers = {"X-Twin-Recruiter-Token": "secret"}
        post = recruiter_api_client.post(
            f"/api/v1/recruiter/inbox/{app_row.id}/audit?company_slug={slug}",
            headers=headers,
            json={"action_type": "review_opened", "meta": {"source": "review_card"}},
        )
        assert post.status_code == 201
        blocked = recruiter_api_client.post(
            f"/api/v1/recruiter/inbox/{app_row.id}/audit?company_slug={slug}",
            headers=headers,
            json={"action_type": "decision_accept", "meta": {"source": "spoof"}},
        )
        assert blocked.status_code == 400
        assert blocked.json()["detail"] == "audit_action_not_allowed"
        listing = recruiter_api_client.get(
            f"/api/v1/recruiter/inbox/{app_row.id}/audit?company_slug={slug}",
            headers=headers,
        )
        assert listing.status_code == 200
        assert listing.json()["items"][0]["action_type"] == "review_opened"
    finally:
        get_settings.cache_clear()
        db.close()


def test_action_types_frozen() -> None:
    assert RECRUITER_AUDIT_ACTION_TYPES == frozenset(
        {
            "decision_accept",
            "decision_decline",
            "review_opened",
            "radar_shortlisted",
            "radar_snoozed",
            "radar_dismissed",
            "radar_draft_prepared",
            "radar_review_card_opened",
        }
    )
