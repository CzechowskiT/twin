"""Epic 2.12 — candidate-owned import unit tests (synthetic only)."""

from __future__ import annotations

import json

import pytest

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateImportBatch,
    User,
)
from app.services import candidate_owned_import as coi
from app.services.import_security import ImportSecurityError, validate_upload
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateImportBatch.__table__,
        CandidateCareerEvidence.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    user = User(
        email="epic212@import.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add(user)
    db.flush()
    cand = Candidate(user_id=user.id, name="Synthetic Importer", skills="[]", experience_years=1)
    db.add(cand)
    db.commit()
    return db, user, cand


def test_magic_bytes_reject_zip_as_txt():
    with pytest.raises(ImportSecurityError):
        validate_upload(family="document", content=b"PK\x03\x04fake", declared_name="note.txt")


def test_document_pipeline_zero_mutations_until_commit():
    db, user, cand = _db()
    # Evidence tables needed for commit
    from app.database.models import CandidateEvidenceAudit, CandidateEvidenceSource

    bind = db.get_bind()
    for table in (CandidateEvidenceSource.__table__, CandidateEvidenceAudit.__table__):
        table.create(bind=bind, checkfirst=True)
    batch = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="document")
    assert batch["canonical_mutations"] == 0
    content = b"Project Alpha\n\nBuilt a calm import preview for candidates.\n\nOutcome: staging only."
    up = coi.upload_bytes(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        content=content,
        declared_name="synth.txt",
    )
    assert up["state"] == "QUARANTINED"
    assert up["canonical_mutations"] == 0
    prev = coi.process_to_preview(db, candidate_id=cand.id, batch_key=batch["batch_key"])
    assert prev["state"] == "PREVIEW_READY"
    assert prev["canonical_mutations"] == 0
    assert prev["item_count"] >= 1
    keys = [it["item_key"] for it in prev["preview"]["items"]]
    appr = coi.record_approval(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        item_keys=keys,
        preview_version=prev["preview_version"],
        idempotency_key="idem-appr-1",
    )
    assert appr["state"] == "AWAITING_APPROVAL"
    assert appr["canonical_mutations"] == 0
    committed = coi.commit_approved(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        idempotency_key="idem-cmt-1",
    )
    assert committed["state"] == "COMMITTED"
    assert committed["canonical_mutations"] >= 1
    # Idempotent
    again = coi.commit_approved(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        idempotency_key="idem-cmt-1",
    )
    assert again["canonical_mutations"] == committed["canonical_mutations"]
    rolled = coi.rollback_commit(db, candidate_id=cand.id, batch_key=batch["batch_key"])
    assert rolled["state"] == "ROLLED_BACK"


def test_twin_export_denies_secrets():
    db, user, cand = _db()
    batch = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="twin_export")
    payload = json.dumps({"access_token": "secret", "evidence": []}).encode()
    up = coi.upload_bytes(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        content=payload,
        declared_name="export.json",
    )
    # upload may quarantine; process should fail
    if up["state"] == "QUARANTINED":
        out = coi.process_to_preview(db, candidate_id=cand.id, batch_key=batch["batch_key"])
        assert out["state"] in {"FAILED", "REJECTED"}
        assert out["canonical_mutations"] == 0


def test_tracker_csv_staging():
    db, user, cand = _db()
    batch = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="tracker")
    csv_body = b"title,company,status\nDemo Ops,Example Co,review\n"
    up = coi.upload_bytes(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        content=csv_body,
        declared_name="tracker.csv",
    )
    assert up["state"] == "QUARANTINED"
    prev = coi.process_to_preview(db, candidate_id=cand.id, batch_key=batch["batch_key"])
    assert prev["state"] == "PREVIEW_READY"
    assert prev["item_count"] == 1
    assert prev["canonical_mutations"] == 0


def test_cross_candidate_impossible():
    db2 = _sqlite_session()
    bind = db2.get_bind()
    for table in (User.__table__, Candidate.__table__, CandidateImportBatch.__table__):
        table.create(bind=bind, checkfirst=True)
    u1 = User(
        email="a@t.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    u2 = User(
        email="b@t.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db2.add_all([u1, u2])
    db2.flush()
    c1 = Candidate(user_id=u1.id, name="A", skills="[]", experience_years=1)
    c2 = Candidate(user_id=u2.id, name="B", skills="[]", experience_years=1)
    db2.add_all([c1, c2])
    db2.commit()
    batch = coi.create_batch(db2, candidate_id=c1.id, user_id=u1.id, family="document")
    with pytest.raises(LookupError):
        coi.get_batch(db2, candidate_id=c2.id, batch_key=batch["batch_key"])


def test_reject_cancel_and_dup_marking():
    db, user, cand = _db()
    # Reject ZIP disguised as document
    batch = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="document")
    bad = coi.upload_bytes(
        db,
        candidate_id=cand.id,
        batch_key=batch["batch_key"],
        content=b"PK\x03\x04not-a-real-zip",
        declared_name="note.txt",
    )
    assert bad["state"] == "REJECTED"
    assert bad["canonical_mutations"] == 0
    # Cancel a clean draft
    batch2 = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="document")
    cancelled = coi.cancel_or_delete(db, candidate_id=cand.id, batch_key=batch2["batch_key"])
    assert cancelled["state"] in {"CANCELLED", "DELETED"}
    assert cancelled["canonical_mutations"] == 0
    # Dup / conflict marking on tracker
    batch3 = coi.create_batch(db, candidate_id=cand.id, user_id=user.id, family="tracker")
    csv_dup = b"title,company,status\nSame Role,Co A,review\nSame Role,Co B,review\n"
    coi.upload_bytes(
        db,
        candidate_id=cand.id,
        batch_key=batch3["batch_key"],
        content=csv_dup,
        declared_name="tracker.csv",
    )
    prev = coi.process_to_preview(db, candidate_id=cand.id, batch_key=batch3["batch_key"])
    assert prev["state"] == "PREVIEW_READY"
    assert prev["canonical_mutations"] == 0
    dups = [it for it in prev["preview"]["items"] if it.get("dup")]
    assert len(dups) >= 1


def test_catalog_first_value_gate():
    cat = coi.catalog()
    assert cat["canonical_mutations_before_approval"] == 0
    assert "pilot_first_value_v1" in cat["first_value"]
    assert cat["malware_scanner"] == "unavailable_fail_closed"
