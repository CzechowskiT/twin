"""Recruiter Wave C slice 5 — activity timeline tests."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_audit_trail import list_company_activity_timeline, log_recruiter_audit_event
from tests.test_auth_integration import _sqlite_session


def _headers() -> dict[str, str]:
    return {"X-Twin-Recruiter-Token": "test-recruiter-token"}


@pytest.fixture()
def client():
    session = _sqlite_session()
    Base.metadata.create_all(bind=session.get_bind())
    session.commit()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, session
    app.dependency_overrides.clear()


def _seed_app(session, company: str = "Nova Hiring PL") -> int:
    user = User(email="tl@ex.com", hashed_password="x", gdpr_consent_at=datetime.now(timezone.utc))
    session.add(user)
    session.flush()
    cand = Candidate(user_id=user.id, name="C", skills="[]", preferred_job_titles="[]")
    session.add(cand)
    session.flush()
    job = Job(
        job_board="pracuj",
        external_id="tl1",
        title="Eng",
        company=company,
        location="W",
        url="https://ex.com",
        description="d",
        is_validated=True,
    )
    session.add(job)
    session.flush()
    app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.PENDING)
    session.add(app_row)
    session.commit()
    return app_row.id


def test_company_activity_timeline_lists_events(client) -> None:
    _, session = client
    app_id = _seed_app(session)
    log_recruiter_audit_event(
        session,
        application_id=app_id,
        company_slug="Nova Hiring PL",
        action_type="review_opened",
        meta={"source": "inbox"},
    )
    out = list_company_activity_timeline(session, company_slug="Nova Hiring PL")
    assert out["total"] >= 1
    assert out["items"][0]["action_type"] == "review_opened"


def test_timeline_pagination(client) -> None:
    _, session = client
    app_id = _seed_app(session)
    for _ in range(3):
        log_recruiter_audit_event(
            session,
            application_id=app_id,
            company_slug="Nova Hiring PL",
            action_type="review_opened",
        )
    page = list_company_activity_timeline(session, company_slug="Nova Hiring PL", limit=2, offset=0)
    assert len(page["items"]) == 2
    assert page["total"] >= 3


def test_timeline_tenant_isolation(client) -> None:
    _, session = client
    app_id = _seed_app(session, company="Other Co")
    log_recruiter_audit_event(session, application_id=app_id, company_slug="Other Co", action_type="review_opened")
    out = list_company_activity_timeline(session, company_slug="Nova Hiring PL")
    assert out["total"] == 0


def test_api_activity_timeline(client, monkeypatch) -> None:
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-recruiter-token")
    get_settings.cache_clear()
    c, session = client
    app_id = _seed_app(session)
    log_recruiter_audit_event(session, application_id=app_id, company_slug="Nova Hiring PL", action_type="review_opened")
    r = c.get("/api/v1/recruiter/activity-timeline?company_slug=nova-hiring-pl", headers=_headers())
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    get_settings.cache_clear()


def test_timeline_read_only_no_mutation_endpoint(client) -> None:
    c, _ = client
    r = c.post("/api/v1/recruiter/activity-timeline?company_slug=nova-hiring-pl", headers=_headers(), json={})
    assert r.status_code == 405
