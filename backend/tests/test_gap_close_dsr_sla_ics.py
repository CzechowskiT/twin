"""Gap-close unit tests — DSR types, SLA, ICS import, collaboration."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    Job,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.candidate_privacy_request_service import (
    create_privacy_request,
    fulfill_privacy_request,
    list_privacy_ops_queue,
)
from app.services.ics_import import import_ics_for_user, parse_ics_events
from app.services.recruiter_collaboration import (
    create_collaboration_note,
    list_collaboration_notes,
)
from app.services.recruiter_sla import build_sla_summary, upsert_sla_targets


def _session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_parse_ics_events_basic() -> None:
    ics = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:hold-1@twin
DTSTART:20260722T100000Z
DTEND:20260722T110000Z
SUMMARY:Busy hold
END:VEVENT
END:VCALENDAR
"""
    events = parse_ics_events(ics)
    assert len(events) == 1
    assert events[0]["uid"] == "hold-1@twin"
    assert events[0]["summary"] == "Busy hold"


def test_ics_import_persists() -> None:
    db = _session()
    user = User(email="ics-import@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    ics = """BEGIN:VCALENDAR
BEGIN:VEVENT
UID:persist-1@twin
DTSTART:20260723T090000Z
DTEND:20260723T093000Z
SUMMARY:Import me
END:VEVENT
END:VCALENDAR
"""
    out = import_ics_for_user(db, user_id=user.id, ics_text=ics)
    assert out["created"] == 1
    assert out["provider_write"] is False


def test_privacy_objection_and_fulfillment() -> None:
    db = _session()
    user = User(email="dsr@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="DSR User",
        skills="[]",
        preferred_job_titles="[]",
        experience_years=1,
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    created = create_privacy_request(
        db,
        candidate_id=cand.id,
        user_id=user.id,
        request_type="objection",
        payload={"reason": "processing"},
    )
    assert created["request_type"] == "objection"
    assert created["fulfillment_status"] == "queued"
    queue = list_privacy_ops_queue(db, limit=10)
    assert queue["total"] >= 1
    fulfilled = fulfill_privacy_request(
        db,
        request_id=created["id"],
        actor_user_id=0,
        fulfillment_status="fulfilled",
        delivery_receipt={"channel": "in_app", "note": "done"},
    )
    assert fulfilled["fulfillment_status"] == "fulfilled"
    assert fulfilled["status"] == "completed"


def test_sla_summary_no_sample_flag() -> None:
    db = _session()
    slug = "acme"
    upsert_sla_targets(
        db,
        company_slug=slug,
        targets=[{"stage_key": "pending", "target_hours": 1}],
    )
    job = Job(
        title="Eng",
        company="Acme",
        location="PL",
        url="https://example.com/j",
        description="d",
        job_board="employer",
        external_id=f"{slug}-role-1",
        is_validated=True,
        scraped_at=datetime.utcnow(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    user = User(email="sla-cand@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)
    cand = Candidate(
        user_id=user.id,
        name="SLA Cand",
        skills="[]",
        preferred_job_titles="[]",
        experience_years=1,
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    old = datetime.now(timezone.utc) - timedelta(hours=5)
    app_row = Application(
        candidate_id=cand.id,
        job_id=job.id,
        status=ApplicationStatus.PENDING,
        recruiter_pipeline_status="pending",
        applied_at=old.replace(tzinfo=None),
        updated_at=old.replace(tzinfo=None),
    )
    db.add(app_row)
    db.commit()
    summary = build_sla_summary(db, company_slug=slug)
    assert summary["sample_metrics"] is False
    assert summary["breach_count"] >= 1


def test_collaboration_rejects_demo_fixture() -> None:
    db = _session()
    with pytest.raises(ValueError, match="demo_fixture_rejected"):
        create_collaboration_note(
            db,
            company_slug="acme",
            subject_type="candidate",
            subject_id="demo-candidate-001",
            body="nope",
        )


def test_collaboration_live_note() -> None:
    db = _session()
    note = create_collaboration_note(
        db,
        company_slug="acme",
        subject_type="candidate",
        subject_id="cand-42",
        body="Ready for shortlist",
        author_label="recruiter",
    )
    assert note["demo"] is False
    listed = list_collaboration_notes(
        db,
        company_slug="acme",
        subject_type="candidate",
        subject_id="cand-42",
    )
    assert len(listed["items"]) >= 1
    assert any(i["body"] == "Ready for shortlist" for i in listed["items"])


def test_calendar_ics_import_api() -> None:
    db = _session()
    user = User(email="ics-api@example.com", hashed_password="x")
    db.add(user)
    db.commit()
    db.refresh(user)

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        with patch("app.api.calendar.get_settings") as m:
            m.return_value.frontend_url = "https://app.example"
            token = create_access_token(user.email)
            client = TestClient(app)
            ics = """BEGIN:VCALENDAR
BEGIN:VEVENT
UID:api-1@twin
DTSTART:20260724T120000Z
DTEND:20260724T130000Z
SUMMARY:API hold
END:VEVENT
END:VCALENDAR
"""
            res = client.post(
                "/api/v1/calendar/me/ics/import",
                headers={"Authorization": f"Bearer {token}"},
                json={"ics_text": ics},
            )
            assert res.status_code == 200, res.text
            body = res.json()
            assert body["imported"] >= 1
            listed = client.get(
                "/api/v1/calendar/me/ics/imports",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert listed.status_code == 200
            assert listed.json()["total"] >= 1
    finally:
        app.dependency_overrides.clear()
