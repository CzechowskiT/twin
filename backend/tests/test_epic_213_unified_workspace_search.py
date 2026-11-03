"""Epic 2.13 — unified workspace search unit tests (synthetic only)."""

from __future__ import annotations

import pytest

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateImportBatch,
    User,
)
from app.services import unified_workspace_search as uws
from app.services.workspace_search_route_inventory import inventory_contract
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    bind = db.get_bind()
    for table in (
        User.__table__,
        Candidate.__table__,
        CandidateCareerEvidence.__table__,
        CandidateImportBatch.__table__,
    ):
        table.create(bind=bind, checkfirst=True)
    u1 = User(
        email="epic213a@search.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    u2 = User(
        email="epic213b@search.test",
        hashed_password="x",
        gdpr_consent_at=__import__("datetime").datetime.utcnow(),
        exclude_from_product_metrics=True,
    )
    db.add_all([u1, u2])
    db.flush()
    c1 = Candidate(user_id=u1.id, name="Synth A", skills="[]", experience_years=1)
    c2 = Candidate(user_id=u2.id, name="Synth B", skills="[]", experience_years=1)
    db.add_all([c1, c2])
    db.commit()
    return db, c1, c2


def test_route_inventory_complete():
    inv = inventory_contract()
    assert inv["total"] >= 40
    assert inv["complete"] == f"{inv['total']}/{inv['total']}"
    assert inv["eighth_primary_nav"] is False


def test_capability_search_no_mutation():
    hits = uws.search_capabilities(q="evidence", locale="en")
    assert hits
    assert all(h["group"] == "capability" for h in hits)
    assert all(str(h["deep_link"]).startswith("/") for h in hits)


def test_evidence_scoped_and_cross_candidate_zero():
    db, c1, c2 = _db()
    phrase = "unique-alpha-phrase-213"
    db.add(
        CandidateCareerEvidence(
            candidate_id=c1.id,
            evidence_key="ek1",
            evidence_type="custom",
            title=f"Project {phrase}",
            summary="Committed summary",
            status="active",
            claim_kind="CANDIDATE_DECLARED",
        )
    )
    db.add(
        CandidateCareerEvidence(
            candidate_id=c2.id,
            evidence_key="ek2",
            evidence_type="custom",
            title=f"Project {phrase}",
            summary="Other candidate",
            status="active",
            claim_kind="CANDIDATE_DECLARED",
        )
    )
    db.commit()
    out1 = uws.run_search(db, candidate_id=c1.id, q=phrase)
    out2 = uws.run_search(db, candidate_id=c2.id, q=phrase)
    assert out1["mutations"] == 0
    assert out1["external_actions"] == 0
    assert out1["first_value_satisfied"] is False
    assert out1["leaks_other_candidates"] is False
    ids1 = {r["opaque_id"] for r in out1["groups"]["record"]}
    ids2 = {r["opaque_id"] for r in out2["groups"]["record"]}
    assert ids1 and ids2
    assert ids1.isdisjoint(ids2)


def test_draft_evidence_excluded():
    db, c1, _ = _db()
    db.add(
        CandidateCareerEvidence(
            candidate_id=c1.id,
            evidence_key="draft1",
            evidence_type="custom",
            title="DraftOnlyPhrase",
            summary="x",
            status="draft",
            claim_kind="UNKNOWN",
        )
    )
    db.commit()
    out = uws.run_search(db, candidate_id=c1.id, q="DraftOnlyPhrase")
    assert out["counts"]["record"] == 0


def test_import_staging_not_indexed():
    db, c1, _ = _db()
    db.add(
        CandidateImportBatch(
            candidate_id=c1.id,
            user_id=1,
            batch_key="b-staging",
            family="document",
            state="STAGED",
            schema_version="candidate_owned_import_v1",
        )
    )
    db.commit()
    out = uws.run_search(db, candidate_id=c1.id, q="document")
    # May match capability "Import Center" but not staging batch as record
    for r in out["groups"]["record"]:
        assert r["type"] != "import_batch" or r["status"] == "COMMITTED"


def test_catalog_engine_constraints():
    cat = uws.catalog()
    assert cat["no_elasticsearch"] is True
    assert cat["no_vector_embeddings"] is True
    assert cat["no_llm_rag"] is True
    assert cat["search_equals_first_value"] is False
    assert cat["eighth_nav_item"] is False
