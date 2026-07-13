"""Recruiter Wave C slice 2 — talent pool + trust review persistence tests."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect

from app.config import get_settings
from app.database.models import (
    Application,
    ApplicationStatus,
    Base,
    Candidate,
    CandidatePrivacyRequest,
    Job,
    RecruiterTalentPoolRecord,
    RecruiterTrustReviewDecision,
    RecruiterTrustReviewItem,
    User,
)
from app.database.session import get_db
from app.main import app
from app.services.recruiter_talent_pool_persistence import (
    add_talent_pool_record,
    archive_talent_pool_record,
    build_privacy_safe_snapshot,
    list_talent_pool_records,
)
from app.services.recruiter_trust_review_persistence import (
    list_trust_review_queue,
    record_trust_review_decision,
    sync_trust_review_from_privacy_requests,
)
from tests.test_auth_integration import _sqlite_session


def _recruiter_headers(db, company: str = "Nova Hiring PL") -> tuple[dict[str, str], str]:
    settings = get_settings()
    token = settings.recruiter_inbox_token or "test-recruiter-token"
    from app.utils.slug import slugify_company

    return {
        "X-Twin-Recruiter-Token": token,
    }, slugify_company(company)


def _seed_company_applicant(db, company: str = "Nova Hiring PL") -> tuple[Candidate, str]:
    user = User(
        email="c2-trust@example.com",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name="Trust Cand",
        skills='["Python"]',
        preferred_job_titles="[]",
        talent_pool_opt_in=True,
        talent_pool_opt_in_at=datetime.now(timezone.utc),
    )
    db.add(cand)
    db.flush()
    job = Job(
        job_board="pracuj",
        external_id="c2-j1",
        title="Engineer",
        company=company,
        location="Warsaw",
        url="https://example.com/j",
        description="d",
        is_validated=True,
    )
    db.add(job)
    db.flush()
    db.add(
        Application(
            candidate_id=cand.id,
            job_id=job.id,
            status=ApplicationStatus.APPLIED,
        )
    )
    db.commit()
    from app.utils.slug import slugify_company

    return cand, slugify_company(company)


def test_migration_072_columns_on_talent_pool() -> None:
    db = _sqlite_session()
    try:
        Base.metadata.create_all(bind=db.get_bind())
        insp = inspect(db.get_bind())
        cols = {c["name"] for c in insp.get_columns("recruiter_talent_pool_records")}
        assert "source_type" in cols
        assert "archived_at" in cols
        assert "snapshot_json" in cols
        assert insp.has_table("recruiter_trust_review_items")
        assert insp.has_table("recruiter_trust_review_decisions")
    finally:
        db.close()


def test_add_talent_pool_record_manual() -> None:
    db = _sqlite_session()
    try:
        out = add_talent_pool_record(
            db,
            company_slug="nova-hiring-pl",
            display_name="Alex Kowalski",
            job_title="Backend Engineer",
            skills=["Python", "FastAPI"],
        )
        assert out["duplicate"] is False
        assert out["record"]["source_type"] == "manual_add"
        assert out["record"]["snapshot"]["display_name"] == "Alex Kowalski"
    finally:
        db.close()


def test_add_talent_pool_idempotent_duplicate() -> None:
    db = _sqlite_session()
    try:
        add_talent_pool_record(
            db,
            company_slug="nova-hiring-pl",
            display_name="Dup Person",
            idempotency_key="dup-1",
        )
        out = add_talent_pool_record(
            db,
            company_slug="nova-hiring-pl",
            display_name="Dup Person",
            idempotency_key="dup-1",
        )
        assert out["duplicate"] is True
    finally:
        db.close()


def test_archive_talent_pool_record() -> None:
    db = _sqlite_session()
    try:
        created = add_talent_pool_record(
            db,
            company_slug="nova-hiring-pl",
            display_name="Archive Me",
        )
        rid = created["record"]["id"]
        archived = archive_talent_pool_record(db, company_slug="nova-hiring-pl", record_id=rid)
        assert archived["archived"] is True
        listed = list_talent_pool_records(db, company_slug="nova-hiring-pl")
        assert all(not i["archived"] for i in listed["items"])
    finally:
        db.close()


def test_talent_pool_cross_tenant_isolation() -> None:
    db = _sqlite_session()
    try:
        created = add_talent_pool_record(
            db,
            company_slug="nova-hiring-pl",
            display_name="Tenant A",
        )
        rid = created["record"]["id"]
        with pytest.raises(ValueError, match="not found"):
            archive_talent_pool_record(db, company_slug="other-co", record_id=rid)
    finally:
        db.close()


def test_privacy_safe_snapshot_no_pii() -> None:
    db = _sqlite_session()
    try:
        snap = build_privacy_safe_snapshot(
            db,
            display_name="Safe Name",
            skills=["Go"],
        )
        blob = str(snap).lower()
        assert "@" not in blob
        assert "email" not in blob
    finally:
        db.close()


def test_opt_in_required_for_linked_candidate() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="no-opt@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()
        cand = Candidate(
            user_id=user.id,
            name="No Opt",
            skills="[]",
            preferred_job_titles="[]",
            talent_pool_opt_in=False,
        )
        db.add(cand)
        db.commit()
        with pytest.raises(ValueError, match="opted in"):
            add_talent_pool_record(
                db,
                company_slug="nova-hiring-pl",
                display_name="No Opt",
                candidate_id=str(cand.id),
            )
    finally:
        db.close()


def test_sync_trust_review_from_privacy_requests() -> None:
    db = _sqlite_session()
    try:
        cand, slug = _seed_company_applicant(db)
        user = db.query(User).filter(User.id == cand.user_id).first()
        db.add(
            CandidatePrivacyRequest(
                candidate_id=cand.id,
                request_type="correction",
                status="open",
                payload_json="{}",
                created_by_user_id=user.id,
            )
        )
        db.commit()
        settings = get_settings()
        created = sync_trust_review_from_privacy_requests(db, company_slug=slug, settings=settings)
        assert created >= 1
        again = sync_trust_review_from_privacy_requests(db, company_slug=slug, settings=settings)
        assert again == 0
    finally:
        db.close()


def test_trust_review_decision_history() -> None:
    db = _sqlite_session()
    try:
        cand, slug = _seed_company_applicant(db)
        user = db.query(User).filter(User.id == cand.user_id).first()
        db.add(
            CandidatePrivacyRequest(
                candidate_id=cand.id,
                request_type="portability",
                status="open",
                payload_json="{}",
                created_by_user_id=user.id,
            )
        )
        db.commit()
        settings = get_settings()
        sync_trust_review_from_privacy_requests(db, company_slug=slug, settings=settings)
        queue = list_trust_review_queue(db, company_slug=slug, settings=settings)
        assert queue["summary"]["total"] >= 1
        item_id = queue["items"][0]["id"]
        out = record_trust_review_decision(
            db,
            company_slug=slug,
            item_id=item_id,
            decision="request_clarification",
            note="Need more context",
            actor_ref="recruiter-test",
        )
        assert out["status"] == "clarification_requested"
        assert out["decision"]["decision"] == "request_clarification"
        row = db.query(RecruiterTrustReviewDecision).filter(RecruiterTrustReviewDecision.item_id == item_id).first()
        assert row is not None
    finally:
        db.close()


def test_trust_review_cross_tenant() -> None:
    db = _sqlite_session()
    try:
        item = RecruiterTrustReviewItem(
            company_slug="nova-hiring-pl",
            item_kind="correction",
            subject_ref="demo-1",
            reason_key="trust.correction",
            reason_summary="Demo",
            status="pending_review",
            consent_state="visible",
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        with pytest.raises(ValueError, match="not found"):
            record_trust_review_decision(
                db,
                company_slug="other-co",
                item_id=item.id,
                decision="approve",
                note=None,
                actor_ref="x",
            )
    finally:
        db.close()


def test_api_talent_pool_add_and_archive(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        slug = "nova-hiring-pl"
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        r = client.post(
            f"/api/v1/recruiter/talent-pool/candidates?company_slug={slug}",
            json={"display_name": "API Person", "skills": ["Rust"]},
            headers=headers,
        )
        assert r.status_code == 201
        rid = r.json()["record"]["id"]
        detail = client.get(
            f"/api/v1/recruiter/talent-pool/{rid}?company_slug={slug}",
            headers=headers,
        )
        assert detail.status_code == 200
        archived = client.patch(
            f"/api/v1/recruiter/talent-pool/{rid}?company_slug={slug}",
            headers=headers,
        )
        assert archived.status_code == 200
        assert archived.json()["archived"] is True
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()


def test_api_trust_review_queue(monkeypatch) -> None:
    from app.config import get_settings

    monkeypatch.setenv("RECRUITER_INBOX_TOKEN", "test-token")
    get_settings.cache_clear()
    db = _sqlite_session()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    try:
        _seed_company_applicant(db)
        client = TestClient(app)
        slug = "nova-hiring-pl"
        headers = {"X-Twin-Recruiter-Token": "test-token"}
        listed = client.get(
            f"/api/v1/recruiter/trust-review-queue?company_slug={slug}",
            headers=headers,
        )
        assert listed.status_code == 200
        assert "items" in listed.json()
        assert listed.json()["pilot_status"] == "PILOT"
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()
        db.close()
