"""Recruiter workspace activation persistence — Wave C slice 1."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import inspect

from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    Job,
    RecruiterActivationEvent,
    RecruiterWorkspaceActivation,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.recruiter_activation_persistence import (
    record_first_decision,
    record_queue_loaded,
    serialize_activation,
)
from tests.test_auth_integration import _sqlite_session


def _seed_application(db, company: str = "Nova Hiring PL") -> tuple[Application, str]:
    user = User(
        email="activation@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Act Cand", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.flush()
    job = Job(
        job_board="pracuj",
        external_id="activation-j1",
        title="Engineer",
        company=company,
        location="Warsaw",
        url="https://example.com/j",
        description="d",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    app_row = Application(
        candidate_id=cand.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
    )
    db.add(app_row)
    db.commit()
    from app.utils.slug import slugify_company

    return app_row, slugify_company(company)


def test_empty_activation_state() -> None:
    db = _sqlite_session()
    try:
        out = serialize_activation(db, company_slug="nova-hiring-pl")
        assert out["configured"] is False
        assert out["completion_percent"] == 0
        assert out["remaining_steps"] == [
            "connect_workspace",
            "load_inbox_queue",
            "first_decision",
        ]
        assert out["pilot_status"] == "PILOT"
    finally:
        db.close()


def test_queue_loaded_idempotent() -> None:
    db = _sqlite_session()
    try:
        record_queue_loaded(db, company_slug="nova-hiring-pl", queue_total=0)
        record_queue_loaded(db, company_slug="nova-hiring-pl", queue_total=3)
        rows = db.query(RecruiterWorkspaceActivation).all()
        assert len(rows) == 1
        assert rows[0].queue_loaded_at is not None
        events = db.query(RecruiterActivationEvent).filter_by(step="load_inbox_queue").all()
        assert len(events) == 1
    finally:
        db.close()


def test_first_decision_is_activation_event() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        record_queue_loaded(db, company_slug=slug, queue_total=1)
        record_first_decision(db, company_slug=slug, action="accept", application_id=app_row.id)
        record_first_decision(db, company_slug=slug, action="decline", application_id=app_row.id)
        row = db.query(RecruiterWorkspaceActivation).filter_by(company_slug=slug).one()
        assert row.first_decision_action == "accept"
        assert row.activation_completed_at is not None
        out = serialize_activation(db, company_slug=slug)
        assert out["activation_complete"] is True
        assert out["completion_percent"] == 100
    finally:
        db.close()


def test_cross_tenant_isolation() -> None:
    db = _sqlite_session()
    try:
        record_queue_loaded(db, company_slug="company-a", queue_total=1)
        record_queue_loaded(db, company_slug="company-b", queue_total=2)
        a = serialize_activation(db, company_slug="company-a")
        b = serialize_activation(db, company_slug="company-b")
        assert a["queue_loaded"] is True
        assert b["queue_loaded"] is True
        assert a["company_slug"] != b["company_slug"]
    finally:
        db.close()


def test_recruiter_activation_api(monkeypatch) -> None:
    from app.config import get_settings

    db = _sqlite_session()
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    try:
        _seed_application(db, "Nova Hiring PL")
        r_inbox = client.get(
            "/api/v1/recruiter/inbox",
            params={"token": "secret", "company_slug": "nova-hiring-pl"},
        )
        assert r_inbox.status_code == 200
        r_act = client.get(
            "/api/v1/recruiter/activation",
            params={"token": "secret", "company_slug": "nova-hiring-pl"},
        )
        assert r_act.status_code == 200
        body = r_act.json()
        assert body["queue_loaded"] is True
        assert body["workspace_connected"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_inbox_respond_records_activation(monkeypatch) -> None:
    from app.config import get_settings

    db = _sqlite_session()
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    try:
        app_row, slug = _seed_application(db)
        client.get(
            "/api/v1/recruiter/inbox",
            params={"token": "secret", "company_slug": slug},
        )
        r = client.post(
            f"/api/v1/recruiter/inbox/{app_row.id}/respond",
            params={"token": "secret", "company_slug": slug},
            json={"action": "accept"},
        )
        assert r.status_code == 200
        act = client.get(
            "/api/v1/recruiter/activation",
            params={"token": "secret", "company_slug": slug},
        ).json()
        assert act["first_decision"] is True
        assert act["activation_complete"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_invalid_token_denied(monkeypatch) -> None:
    from app.config import get_settings

    db = _sqlite_session()
    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    try:
        r = client.get(
            "/api/v1/recruiter/activation",
            params={"token": "wrong", "company_slug": "nova-hiring-pl"},
        )
        assert r.status_code == 401
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_migration_upgrade_creates_tables() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        names = inspect(db.get_bind()).get_table_names()
        assert "recruiter_workspace_activation" in names
        assert "recruiter_activation_events" in names
    finally:
        db.close()
