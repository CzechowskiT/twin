"""Candidate trust center persistence API — Wave B slice 2."""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database.models import (
    Base,
    Candidate,
    CandidateConsentReceipt,
    CandidatePrivacyRequest,
    CandidateTrustAuditEvent,
    User,
)
from app.database.session import get_db
from app.main import app
from tests.test_auth_integration import _sqlite_session


def _seed_user(db: Session, email: str = "trust@example.com") -> tuple[User, Candidate]:
    user = User(
        email=email,
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Trust User", skills="[]", preferred_job_titles="[]")
    db.add(cand)
    db.commit()
    return user, cand


def _client_for(db: Session, user: User) -> TestClient:
    def override_db():
        try:
            yield db
        finally:
            pass

    def _user() -> User:
        row = db.query(User).filter(User.id == user.id).first()
        assert row is not None
        return row

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = _user
    return TestClient(app)


def _other_user(db: Session) -> tuple[User, Candidate]:
    return _seed_user(db, "other-trust@example.com")


# --- Trust hub ---


def test_get_trust_center_empty() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db)
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/trust")
        assert r.status_code == 200
        body = r.json()
        assert body["configured"] is True
        assert body["pilot_labelled"] is True
        assert "manual_processing_notice" in body
        assert isinstance(body["consent_items"], list)
        assert len(body["consent_items"]) == 4
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_trust_center_requires_auth() -> None:
    db = _sqlite_session()
    try:
        client = TestClient(app)
        r = client.get("/api/v1/candidates/me/trust")
        assert r.status_code in {401, 403}
    finally:
        db.close()


def test_trust_center_no_profile_404() -> None:
    db = _sqlite_session()
    try:
        user = User(
            email="noprofile@example.com",
            hashed_password="x",
            gdpr_consent_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/trust")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- Consents ---


def test_get_consents_defaults() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "consents@example.com")
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/consents")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 4
        assert all(i["status"] == "not_granted" for i in items)
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_post_grant_cv_consent() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "grant@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/consents", json={"purpose": "cv_processing"})
        assert r.status_code == 201
        cv = next(i for i in r.json()["items"] if i["purpose"] == "cv_processing")
        assert cv["status"] == "active"
        db.refresh(cand)
        assert cand.cv_processing_consent_at is not None
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_patch_withdraw_talent_pool() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "withdraw@example.com")
        cand.talent_pool_opt_in = True
        cand.talent_pool_opt_in_at = datetime.now(timezone.utc)
        db.commit()
        client = _client_for(db, user)
        r = client.patch(
            "/api/v1/candidates/me/consents",
            json={"purpose": "talent_pool", "action": "withdraw"},
        )
        assert r.status_code == 200
        tp = next(i for i in r.json()["items"] if i["purpose"] == "talent_pool")
        assert tp["status"] == "not_granted"
        db.refresh(cand)
        assert cand.talent_pool_opt_in is False
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_consent_idempotency() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "idem-consent@example.com")
        client = _client_for(db, user)
        key = "grant-cv-once"
        r1 = client.post(
            "/api/v1/candidates/me/consents",
            json={"purpose": "cv_processing", "idempotency_key": key},
        )
        r2 = client.post(
            "/api/v1/candidates/me/consents",
            json={"purpose": "cv_processing", "idempotency_key": key},
        )
        assert r1.status_code == 201
        assert r2.status_code == 201
        receipts = (
            db.query(CandidateConsentReceipt)
            .filter(CandidateConsentReceipt.candidate_id == cand.id)
            .all()
        )
        assert len(receipts) == 1
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_consent_invalid_purpose() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "bad-purpose@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/consents", json={"purpose": "invalid"})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_grant_profile_documents_consent() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "docs@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/consents", json={"purpose": "profile_documents"})
        assert r.status_code == 201
        doc = next(i for i in r.json()["items"] if i["purpose"] == "profile_documents")
        assert doc["status"] == "active"
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- Consent receipts ---


def test_list_consent_receipts_empty() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "receipts-empty@example.com")
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/consent-receipts")
        assert r.status_code == 200
        assert r.json()["total"] == 0
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_consent_receipt_created_on_grant() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "receipt-grant@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/consents", json={"purpose": "intro_audio_processing"})
        r = client.get("/api/v1/candidates/me/consent-receipts")
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["items"][0]["action"] == "grant"
        assert body["items"][0]["consent_purpose"] == "intro_audio_processing"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_consent_receipt_pagination() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "receipt-page@example.com")
        client = _client_for(db, user)
        for i in range(3):
            client.post(
                "/api/v1/candidates/me/consents",
                json={"purpose": "cv_processing", "idempotency_key": f"k{i}"},
            )
        r = client.get("/api/v1/candidates/me/consent-receipts?limit=2&offset=0")
        assert r.status_code == 200
        assert len(r.json()["items"]) == 2
        assert r.json()["total"] >= 3
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- Privacy requests ---


def test_create_privacy_request_correction() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "privacy@example.com")
        client = _client_for(db, user)
        r = client.post(
            "/api/v1/candidates/me/privacy-requests",
            json={"request_type": "correction", "payload": {"field": "name", "value": "New Name"}},
        )
        assert r.status_code == 201
        body = r.json()
        assert body["status"] == "open"
        assert body["request_type"] == "correction"
        assert "manual_processing_notice" in body
        rows = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.candidate_id == cand.id).all()
        assert len(rows) == 1
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_list_privacy_requests() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-list@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "export"})
        client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "portability"})
        r = client.get("/api/v1/candidates/me/privacy-requests")
        assert r.status_code == 200
        assert r.json()["total"] == 2
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_get_privacy_request_by_id() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-get@example.com")
        client = _client_for(db, user)
        created = client.post(
            "/api/v1/candidates/me/privacy-requests",
            json={"request_type": "deletion"},
        ).json()
        r = client.get(f"/api/v1/candidates/me/privacy-requests/{created['id']}")
        assert r.status_code == 200
        assert r.json()["request_type"] == "deletion"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_get_privacy_request_not_found() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-404@example.com")
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/privacy-requests/99999")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_cancel_privacy_request() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-cancel@example.com")
        client = _client_for(db, user)
        created = client.post(
            "/api/v1/candidates/me/privacy-requests",
            json={"request_type": "withdrawal"},
        ).json()
        r = client.post(f"/api/v1/candidates/me/privacy-requests/{created['id']}/cancel")
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_cancel_completed_request_fails() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "privacy-done@example.com")
        row = CandidatePrivacyRequest(
            candidate_id=cand.id,
            request_type="export",
            status="completed",
            payload_json="{}",
            created_by_user_id=user.id,
        )
        db.add(row)
        db.commit()
        client = _client_for(db, user)
        r = client.post(f"/api/v1/candidates/me/privacy-requests/{row.id}/cancel")
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_privacy_request_idempotency() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "privacy-idem@example.com")
        client = _client_for(db, user)
        payload = {"request_type": "export", "idempotency_key": "export-once"}
        r1 = client.post("/api/v1/candidates/me/privacy-requests", json=payload)
        r2 = client.post("/api/v1/candidates/me/privacy-requests", json=payload)
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["id"] == r2.json()["id"]
        count = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.candidate_id == cand.id).count()
        assert count == 1
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_privacy_request_invalid_type() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-bad@example.com")
        client = _client_for(db, user)
        r = client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "spam"})
        assert r.status_code == 422
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_all_privacy_request_types() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "privacy-types@example.com")
        client = _client_for(db, user)
        for req_type in (
            "correction",
            "export",
            "portability",
            "withdrawal",
            "deletion",
            "identity_review",
        ):
            r = client.post(
                "/api/v1/candidates/me/privacy-requests",
                json={"request_type": req_type, "idempotency_key": req_type},
            )
            assert r.status_code == 201, req_type
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- Audit events ---


def test_audit_events_empty() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "audit-empty@example.com")
        client = _client_for(db, user)
        r = client.get("/api/v1/candidates/me/trust/audit-events")
        assert r.status_code == 200
        assert r.json()["total"] == 0
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_audit_event_on_consent_grant() -> None:
    db = _sqlite_session()
    try:
        user, cand = _seed_user(db, "audit-grant@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/consents", json={"purpose": "cv_processing"})
        r = client.get("/api/v1/candidates/me/trust/audit-events")
        assert r.status_code == 200
        assert r.json()["total"] >= 1
        assert r.json()["items"][0]["event_type"] == "consent_granted"
        db_count = (
            db.query(CandidateTrustAuditEvent)
            .filter(CandidateTrustAuditEvent.candidate_id == cand.id)
            .count()
        )
        assert db_count >= 1
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_audit_event_on_privacy_request() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "audit-privacy@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "correction"})
        r = client.get("/api/v1/candidates/me/trust/audit-events")
        assert r.status_code == 200
        types = {i["event_type"] for i in r.json()["items"]}
        assert "privacy_request_created" in types
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_trust_timeline_in_hub() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "timeline@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/consents", json={"purpose": "cv_processing"})
        r = client.get("/api/v1/candidates/me/trust")
        assert r.status_code == 200
        assert len(r.json()["trust_timeline"]) >= 1
        assert r.json()["audit_event_count"] >= 1
    finally:
        app.dependency_overrides.clear()
        db.close()


# --- Auth isolation ---


def test_privacy_request_isolation_between_users() -> None:
    db = _sqlite_session()
    try:
        user_a, _ = _seed_user(db, "iso-a@example.com")
        user_b, _ = _other_user(db)
        client_a = _client_for(db, user_a)
        created = client_a.post(
            "/api/v1/candidates/me/privacy-requests",
            json={"request_type": "export"},
        ).json()
        client_b = _client_for(db, user_b)
        r = client_b.get(f"/api/v1/candidates/me/privacy-requests/{created['id']}")
        assert r.status_code == 404
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_consent_receipts_isolation() -> None:
    db = _sqlite_session()
    try:
        user_a, _ = _seed_user(db, "iso-rcpt-a@example.com")
        user_b, _ = _other_user(db)
        client_a = _client_for(db, user_a)
        client_a.post("/api/v1/candidates/me/consents", json={"purpose": "cv_processing"})
        r_a = client_a.get("/api/v1/candidates/me/consent-receipts")
        client_b = _client_for(db, user_b)
        r_b = client_b.get("/api/v1/candidates/me/consent-receipts")
        assert r_a.json()["total"] == 1
        assert r_b.json()["total"] == 0
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_migration_tables_exist() -> None:
    db = _sqlite_session()
    try:
        from sqlalchemy import inspect

        engine = db.get_bind()
        insp = inspect(engine)
        for table in (
            "candidate_consent_receipts",
            "candidate_privacy_requests",
            "candidate_trust_audit_events",
        ):
            assert table in insp.get_table_names()
    finally:
        db.close()


def test_trust_center_privacy_counts() -> None:
    db = _sqlite_session()
    try:
        user, _ = _seed_user(db, "counts@example.com")
        client = _client_for(db, user)
        client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "export"})
        client.post("/api/v1/candidates/me/privacy-requests", json={"request_type": "export", "idempotency_key": "e2"})
        r = client.get("/api/v1/candidates/me/trust")
        assert r.status_code == 200
        assert r.json()["privacy_request_counts"].get("export", 0) >= 2
    finally:
        app.dependency_overrides.clear()
        db.close()
