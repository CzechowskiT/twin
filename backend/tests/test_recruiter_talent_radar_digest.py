from collections.abc import Iterator
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.models import Application, ApplicationStatus, Base, Candidate, Job, User
from app.database.session import get_db
from app.main import app
from app.services.recruiter_talent_radar_decisions import log_recruiter_talent_radar_decision
from app.services.recruiter_talent_radar_digest import build_recruiter_talent_radar_digest
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
        email="digest@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Digest Cand", skills='["python"]', preferred_job_titles='["engineer"]')
    db.add(cand)
    job = Job(
        job_board="pracuj",
        external_id="digest-j1",
        title="Backend Engineer",
        company="Digest Co",
        url="https://example.com/j",
        is_validated=True,
        requirements="python fastapi",
        description="Backend role",
    )
    db.add(job)
    db.flush()
    app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
    db.add(app_row)
    db.commit()
    return app_row, "digest-co"


def test_digest_service_returns_shape() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en", period="7d")
        assert "period" in out
        assert "summary" in out
        assert "sections" in out
        assert out["emailSent"] is False
        assert out["automaticOutreach"] is False
        assert "reviewFirst" in out["sections"]
        assert "draftsPrepared" in out["sections"]
        assert app_row.id
    finally:
        db.close()


def test_digest_company_scoping_rejects_bad_slug() -> None:
    db = _sqlite_session()
    try:
        with pytest.raises(ValueError):
            build_recruiter_talent_radar_digest(db, company_slug="", locale="en")
    finally:
        db.close()


def test_digest_period_filter() -> None:
    db = _sqlite_session()
    try:
        _, slug = _seed_application(db)
        week = build_recruiter_talent_radar_digest(db, company_slug=slug, period="week")
        month = build_recruiter_talent_radar_digest(db, company_slug=slug, period="30d")
        assert week["period"]["label"]
        assert month["period"]["label"]
        assert week["period"]["from"] != month["period"]["from"] or week["period"]["label"] != month["period"]["label"]
    finally:
        db.close()


def test_returning_from_snooze_logic() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="snoozed",
            snooze_days=7,
        )
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        returning = out["sections"]["returningFromSnooze"]
        assert isinstance(returning, list)
        assert out["summary"]["returningFromSnooze"] >= 0
    finally:
        db.close()


def test_shortlist_without_follow_up_logic() -> None:
    db = _sqlite_session()
    try:
        from app.database.models import RecruiterTalentRadarDecision

        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="shortlisted",
        )
        dec_row = (
            db.query(RecruiterTalentRadarDecision)
            .filter(RecruiterTalentRadarDecision.application_id == app_row.id)
            .first()
        )
        assert dec_row
        dec_row.created_at = datetime.now(timezone.utc) - timedelta(days=5)
        db.commit()
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        assert out["summary"]["shortlistedWithoutFollowUp"] >= 1
    finally:
        db.close()


def test_dismissed_reason_aggregation() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="dismissed",
            dismiss_reason_code="low_fit",
        )
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        patterns = out["sections"]["dismissedPatterns"]
        assert any(p.get("reasonCode") == "low_fit" for p in patterns)
    finally:
        db.close()


def test_drafts_prepared_not_sent() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="draft_prepared",
            meta={"source": "talent_radar", "job_id": "1"},
        )
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        assert out["summary"]["draftsPreparedNotSent"] >= 1
        drafts = out["sections"]["draftsPrepared"]
        assert drafts[0].get("status") == "not_sent"
        assert drafts[0].get("draftCount") == 1
        assert drafts[0].get("aggregateLabel")
    finally:
        db.close()


def test_drafts_deduplicated_per_candidate() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        for _ in range(4):
            log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type="draft_prepared",
                meta={"source": "talent_radar"},
            )
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="pl")
        drafts = out["sections"]["draftsPrepared"]
        assert len(drafts) == 1
        assert drafts[0]["draftCount"] == 4
        assert out["summary"]["draftsPreparedNotSent"] == 1
        assert out["summary"]["draftDecisionCount"] == 4
        assert "4 szkiców" in drafts[0]["aggregateLabel"]
    finally:
        db.close()


def test_section_limited_to_five() -> None:
    db = _sqlite_session()
    try:
        _, slug = _seed_application(db)
        for i in range(8):
            user = User(
                email=f"digest-limit{i}@example.com",
                hashed_password="x",
                gdpr_consent_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()
            cand = Candidate(user_id=user.id, name=f"Cand {i}", skills='["python"]')
            db.add(cand)
            job = Job(
                job_board="pracuj",
                external_id=f"digest-limit-j{i}",
                title="Backend Engineer",
                company="Digest Co",
                url=f"https://example.com/j{i}",
                is_validated=True,
                requirements="python",
                description="Backend",
            )
            db.add(job)
            db.flush()
            app_row = Application(candidate_id=cand.id, job_id=job.id, status=ApplicationStatus.APPLIED)
            db.add(app_row)
            db.flush()
            log_recruiter_talent_radar_decision(
                db,
                application_id=app_row.id,
                company_slug=slug,
                action_type="draft_prepared",
            )
        db.commit()
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        meta = out["sectionMeta"]["draftsPrepared"]
        assert len(out["sections"]["draftsPrepared"]) == 5
        assert meta["totalCount"] >= 8
        assert meta["moreInRadarCount"] >= 3
    finally:
        db.close()


def test_unique_candidate_count_in_summary() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        log_recruiter_talent_radar_decision(
            db,
            application_id=app_row.id,
            company_slug=slug,
            action_type="draft_prepared",
        )
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        assert out["summary"]["uniqueCandidateCount"] >= 1
        assert "uniqueCandidateCount" in out["summary"]
    finally:
        db.close()


def test_narrative_mentions_unique_candidates() -> None:
    db = _sqlite_session()
    try:
        _, slug = _seed_application(db)
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="pl")
        assert "unikalnych" in out["narrative"] or "łącznie" in out["narrative"]
    finally:
        db.close()


def test_no_pii_in_digest_candidates() -> None:
    db = _sqlite_session()
    try:
        app_row, slug = _seed_application(db)
        out = build_recruiter_talent_radar_digest(db, company_slug=slug, locale="en")
        blob = str(out).lower()
        assert "digest@example.com" not in blob
        assert "@example.com" not in blob
        assert app_row.id
    finally:
        db.close()


def test_app_import() -> None:
    from app.main import app as fastapi_app

    assert fastapi_app is not None


def test_digest_api_route_exists() -> None:
    routes = [r.path for r in app.routes if hasattr(r, "path")]
    assert "/api/v1/recruiter/talent-radar/digest" in routes
