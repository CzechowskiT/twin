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
from app.services.recruiter_audit_trail import list_recruiter_audit_events
from app.services.recruiter_talent_radar import build_recruiter_talent_radar
from app.services.recruiter_talent_radar_decisions import (
    RADAR_DECISION_ACTION_TYPES,
    RADAR_DISMISS_REASON_CODES,
    RADAR_SNOOZE_DAYS,
    list_recruiter_talent_radar_decisions,
    log_recruiter_talent_radar_decision,
)
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
        email="radar-dec@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Radar Dec", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    job = Job(
        job_board="pracuj",
        external_id="radar-dec-j1",
        title="Engineer",
        company="Radar Dec Co",
        url="https://example.com/j",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(app_row)
    db.commit()
    return app_row, "radar-dec-co"


def test_action_types_frozen() -> None:
    assert RADAR_DECISION_ACTION_TYPES == frozenset(
        {"shortlisted", "snoozed", "dismissed", "draft_prepared", "review_card_opened"}
    )


def test_shortlist_persists_and_audits() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        out = log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="shortlisted",
            meta={"source": "talent_radar"},
        )
        assert out["action_type"] == "shortlisted"
        assert out["decision_state"] == "shortlisted"
        events = list_recruiter_audit_events(db, application_id=app_row.id, company_slug=slug)
        assert events["items"][0]["action_type"] == "radar_shortlisted"
    finally:
        db.close()


def test_snooze_requires_valid_days() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        with pytest.raises(ValueError, match="snooze_days"):
            log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type="snoozed",
                snooze_days=14,
            )
        for days in RADAR_SNOOZE_DAYS:
            out = log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type="snoozed",
                snooze_days=days,
            )
            assert out["meta"]["snooze_days"] == str(days)
            assert out["snooze_until"]
    finally:
        db.close()


def test_dismiss_requires_reason_code() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        with pytest.raises(ValueError, match="dismiss_reason_code"):
            log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type="dismissed",
            )
        out = log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="dismissed",
            dismiss_reason_code="low_fit",
        )
        assert out["meta"]["dismiss_reason_code"] == "low_fit"
        assert out["decision_state"] == "dismissed"
        assert "low_fit" in RADAR_DISMISS_REASON_CODES
    finally:
        db.close()


def test_audit_only_actions_do_not_change_filter_state() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        for act in ("draft_prepared", "review_card_opened"):
            out = log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type=act,
            )
            assert out["decision_state"] == "active"
    finally:
        db.close()


def test_draft_prepared_stores_radar_snapshots_in_meta() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        out = log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="draft_prepared",
            meta={
                "source": "talent_radar",
                "candidate_id": "cand-1",
                "job_id": "9",
                "radar_score_snapshot": "72",
                "radar_fit_label_snapshot": "good",
            },
        )
        assert out["action_type"] == "draft_prepared"
        assert out["meta"]["candidate_id"] == "cand-1"
        assert out["meta"]["job_id"] == "9"
        assert out["meta"]["radar_score_snapshot"] == "72"
        assert out["meta"]["radar_fit_label_snapshot"] == "good"
    finally:
        db.close()


def test_list_decision_filters() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db, application_id=app_row.id, company_slug=slug, action_type="shortlisted"
        )
        active = list_recruiter_talent_radar_decisions(db, company_slug=slug, decision_filter="active")
        shortlisted = list_recruiter_talent_radar_decisions(
            db, company_slug=slug, decision_filter="shortlisted"
        )
        assert len(active["items"]) == 0
        assert len(shortlisted["items"]) == 1
    finally:
        db.close()


def test_talent_radar_includes_latest_decision() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db, application_id=app_row.id, company_slug=slug, action_type="shortlisted"
        )
        out = build_recruiter_talent_radar(db, company_slug=slug, locale="en")
        assert out["suggestions"]
        row = out["suggestions"][0]
        assert row["latest_decision"]["action_type"] == "shortlisted"
        assert row["latest_decision"]["decision_state"] == "shortlisted"
    finally:
        db.close()


def test_recruiter_decisions_api_post_and_get(monkeypatch, recruiter_api_client: TestClient) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "secret")
    get_settings.cache_clear()
    override = app.dependency_overrides[get_db]
    db = next(override())
    try:
        app_row, slug = _seed_application(db)
        headers = {"X-Twin-Recruiter-Token": "secret"}
        post = recruiter_api_client.post(
            f"/api/v1/recruiter/talent-radar/decisions?company_slug={slug}",
            headers=headers,
            json={"application_id": app_row.id, "action_type": "shortlisted"},
        )
        assert post.status_code == 201
        assert post.json()["decision_state"] == "shortlisted"
        listing = recruiter_api_client.get(
            f"/api/v1/recruiter/talent-radar/decisions?company_slug={slug}&decision_filter=shortlisted",
            headers=headers,
        )
        assert listing.status_code == 200
        assert listing.json()["items"][0]["application_id"] == app_row.id
        blocked = recruiter_api_client.post(
            f"/api/v1/recruiter/talent-radar/decisions?company_slug={slug}",
            headers=headers,
            json={"application_id": app_row.id, "action_type": "snoozed"},
        )
        assert blocked.status_code == 400
    finally:
        get_settings.cache_clear()
        db.close()
