"""Investor Wave 4 — NDA, data room metadata, readonly summaries, Hard LIVE evidence."""

from collections.abc import Iterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db
from app.core.security import create_access_token
from app.database.models import Base, DataRoomDocumentMetadata, PlacementEvent, User
from app.main import app
from app.services import investor_wave4 as wave4


@pytest.fixture
def wave4_client() -> Iterator[tuple[TestClient, Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_local = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = session_local()

    def override_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)
    yield client, db
    app.dependency_overrides.pop(get_db, None)
    db.close()


def _auth_user(db: Session, *, excluded: bool = True) -> tuple[User, dict[str, str]]:
    user = User(
        email="wave4-investor@twin.internal",
        hashed_password="x",
        gdpr_consent_at=datetime.now(timezone.utc),
        exclude_from_product_metrics=excluded,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    headers = {"Authorization": f"Bearer {create_access_token(user.email)}"}
    return user, headers


def test_wave4_status_requires_auth(wave4_client: tuple[TestClient, Session]) -> None:
    client, _db = wave4_client
    assert client.get("/api/v1/platform/wave4/status").status_code == 401


def test_wave4_status_and_policy_holds(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave4/status", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["live_claim"] is False
    assert body["pilot_stance"] == "BLOCKED_BY_FOUNDER"
    assert body["gate_f"] == "PENDING"
    assert body["launch"] == "NO-GO"
    assert body["external_pilot_enrollment_enabled"] is False
    assert body["ats_live_sync"] == "BLOCKED"
    assert body["microsoft_write"] == "BLOCKED"
    assert body["stripe_public"] == "NOT_LIVE"
    assert body["authologic_kyc"] == "OFF"
    assert len(body["smokeable_module_ids"]) == 12
    assert "investor_self_serve_enrollment" in body["held_module_ids"]

    holds = client.get("/api/v1/platform/wave4/policy-holds", headers=headers)
    assert holds.status_code == 200
    assert holds.json()["launch"] == "NO-GO"
    assert holds.json()["external_pilot_enrollment"] is False


def test_wave4_held_module_cannot_pass(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)
    client.get("/api/v1/platform/wave4/status", headers=headers)
    res = client.post(
        "/api/v1/platform/wave4/hard-live/evidence/mark",
        headers=headers,
        json={
            "module_id": "investor_self_serve_enrollment",
            "status": "PASS",
            "smoke_sha": "abc",
        },
    )
    assert res.status_code == 422


def test_wave4_nda_accept_and_status(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)
    before = client.get("/api/v1/platform/wave4/nda/status", headers=headers)
    assert before.status_code == 200
    assert before.json()["accepted"] is False

    bad = client.post(
        "/api/v1/platform/wave4/nda/accept",
        headers=headers,
        json={"nda_version": "old-version"},
    )
    assert bad.status_code == 422

    ok = client.post(
        "/api/v1/platform/wave4/nda/accept",
        headers=headers,
        json={"nda_version": wave4.CURRENT_NDA_VERSION},
    )
    assert ok.status_code == 200
    assert ok.json()["accepted"] is True

    after = client.get("/api/v1/platform/wave4/nda/status", headers=headers)
    assert after.json()["accepted"] is True


def test_wave4_data_room_documents(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    user, headers = _auth_user(db)
    db.add(
        DataRoomDocumentMetadata(
            user_id=user.id,
            category="legal",
            filename="nda.pdf",
            content_type="application/pdf",
            size_bytes=1024,
            status="validated",
        )
    )
    db.commit()

    res = client.get("/api/v1/platform/wave4/data-room/documents", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert body["metadata_only_honesty"] is True
    assert body["items"][0]["filename"] == "nda.pdf"

    investor = client.get("/api/v1/investor/data-room/documents", headers=headers)
    assert investor.status_code == 200
    assert investor.json()["count"] == 1


def test_wave4_placement_and_trust_summaries(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)
    db.add(
        PlacementEvent(
            event_type="placement.declared",
            actor="candidate",
            source="twin_internal",
        )
    )
    db.commit()

    placement = client.get("/api/v1/platform/wave4/placement/summary", headers=headers)
    assert placement.status_code == 200
    assert placement.json()["total_events"] == 1
    assert placement.json()["write_forbidden"] is True

    trust = client.get("/api/v1/platform/wave4/trust-proof/summary", headers=headers)
    assert trust.status_code == 200
    assert trust.json()["readonly"] is True
    assert trust.json()["counters"]["external_attestations"] == "HITL_QUEUE"
    assert trust.json()["verified_customer_claims"] is False
    assert trust.json()["counters"]["verified_customer_claims"] is False


def test_wave4_external_attestations_hitl(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)

    empty = client.get("/api/v1/platform/wave4/attestations", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["verified_customer_claims"] is False
    assert empty.json()["signed_count"] == 0

    created = client.post(
        "/api/v1/platform/wave4/attestations",
        headers=headers,
        json={
            "subject_label": "Pilot customer A",
            "claim_text": "Used TWIN for ranked interview calendar — founder-signed only.",
            "evidence_ref": "docs/evidence/attestation-a.md",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "PENDING_FOUNDER_SIGNATURE"
    assert body["signed_by"] is None
    att_id = body["id"]

    pending_trust = client.get("/api/v1/platform/wave4/trust-proof/summary", headers=headers)
    assert pending_trust.json()["verified_customer_claims"] is False

    signed = client.post(
        f"/api/v1/platform/wave4/attestations/{att_id}/sign",
        headers=headers,
        json={"signed_by": "Founder"},
    )
    assert signed.status_code == 200
    assert signed.json()["status"] == "SIGNED"
    assert signed.json()["signed_by"] == "Founder"
    assert signed.json()["signed_at"] is not None

    listed = client.get("/api/v1/platform/wave4/attestations", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["verified_customer_claims"] is True
    assert listed.json()["signed_count"] == 1

    status_body = client.get("/api/v1/platform/wave4/status", headers=headers)
    assert status_body.json()["verified_customer_claims"] is True
    assert status_body.json()["microsoft_write"] == "BLOCKED"
    assert status_body.json()["microsoft_calendar_write_enabled"] is False
    assert "microsoft_busy_read_enabled" in status_body.json()

    rejected = client.post(
        "/api/v1/platform/wave4/attestations",
        headers=headers,
        json={
            "subject_label": "Rejected claim",
            "claim_text": "This claim will be rejected by founder.",
        },
    )
    rej_id = rejected.json()["id"]
    rej = client.post(
        f"/api/v1/platform/wave4/attestations/{rej_id}/reject",
        headers=headers,
    )
    assert rej.status_code == 200
    assert rej.json()["status"] == "REJECTED"


def test_wave4_board_readiness(wave4_client: tuple[TestClient, Session]) -> None:
    client, db = wave4_client
    _user, headers = _auth_user(db)
    res = client.get("/api/v1/platform/wave4/board/readiness", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["launch"] == "NO-GO"
    assert body["live_claim"] is False
    assert body["wave4_partial_modules"] == 12
    assert body["wave4_held_modules"] == 3


def test_wave4_seed_counts(wave4_client: tuple[TestClient, Session]) -> None:
    _client, db = wave4_client
    created = wave4.seed_flags_and_evidence(db)
    assert created > 0
    evidence = wave4.list_hard_live_evidence(db)
    assert evidence["counts"]["partial"] == 12
    assert evidence["counts"]["held_policy"] == 3
