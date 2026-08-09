"""Epic 2.21 — Workspace cohesion context-preserving handoffs.

Opaque Fernet envelopes (TTL≤30m, depth≤3). No DB handoff store.
Handoff is a context hint — never authorization. Zero mutations here.
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime
from typing import Any

from cryptography.fernet import InvalidToken
from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAppStudioWorkspace,
    CandidateCareerPack,
    CandidateDataTrustReview,
    CandidateImportBatch,
    CandidateNormalizedOpportunity,
    User,
)
from app.services.candidate_workspace_handoff_constants import (
    BEHAVIORAL_SURVEILLANCE,
    CONTEXT_SCHEMA_ID,
    CONTRACT_ID,
    DEFAULT_TTL_SECONDS,
    EIGHTH_PRIMARY_NAV,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_HANDOFF,
    HANDOFF_REGISTRY,
    MAX_DEPTH,
    MAX_TTL_SECONDS,
    MUTATIONS_AT_HANDOFF_LAYER,
    NEXT_BEST_ACTION,
    PARALLEL_ACTIVITY_TIMELINE,
    PARALLEL_HANDOFF_OR_CHECKPOINT_STORE,
    PARALLEL_JOURNEY_GRAPH,
    REGISTRY_SCHEMA_ID,
    ROUTE_KEYS,
    URGENCY_SCORES,
)
from app.services.token_crypto import decrypt_secret, encrypt_secret


def _utcnow() -> datetime:
    return datetime.utcnow()


def catalog() -> dict[str, Any]:
    entries = []
    for hid, meta in HANDOFF_REGISTRY.items():
        entries.append(
            {
                "handoff_id": hid,
                "source_route_key": meta["source_route_key"],
                "dest_route_key": meta["dest_route_key"],
                "return_route_key": meta["return_route_key"],
                "source_href": ROUTE_KEYS[meta["source_route_key"]],
                "dest_href": ROUTE_KEYS[meta["dest_route_key"]],
                "return_href": ROUTE_KEYS[meta["return_route_key"]],
                "object_kind": meta["object_kind"],
                "journey": meta["journey"],
                "label": meta["label"],
                "prefer_continuity_flow": meta.get("prefer_continuity_flow"),
            }
        )
    return {
        "schema_id": REGISTRY_SCHEMA_ID,
        "context_schema_id": CONTEXT_SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "parallel_handoff_or_checkpoint_store": PARALLEL_HANDOFF_OR_CHECKPOINT_STORE,
        "parallel_activity_timeline": PARALLEL_ACTIVITY_TIMELINE,
        "parallel_journey_graph": PARALLEL_JOURNEY_GRAPH,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "first_value_satisfied_by_handoff": FIRST_VALUE_SATISFIED_BY_HANDOFF,
        "behavioral_surveillance": BEHAVIORAL_SURVEILLANCE,
        "next_best_action": NEXT_BEST_ACTION,
        "urgency_scores": URGENCY_SCORES,
        "mutations_at_handoff_layer": MUTATIONS_AT_HANDOFF_LAYER,
        "default_ttl_seconds": DEFAULT_TTL_SECONDS,
        "max_depth": MAX_DEPTH,
        "route_keys": dict(ROUTE_KEYS),
        "handoffs": entries,
        "continuity_sole_continue_owner": True,
    }


def _digest(handle: str) -> str:
    return hashlib.sha256(handle.encode("utf-8")).hexdigest()[:32]


def _verify_object(
    db: Session,
    *,
    candidate_id: int,
    object_kind: str,
    object_ref: str,
    object_revision: str | None,
) -> dict[str, Any]:
    """Destination-style ownership recheck (hint only — never authz bypass)."""
    if object_kind == "import_batch":
        row = (
            db.query(CandidateImportBatch)
            .filter(
                CandidateImportBatch.candidate_id == candidate_id,
                CandidateImportBatch.batch_key == object_ref,
                CandidateImportBatch.deleted_at.is_(None),
            )
            .one_or_none()
        )
        if row is None:
            raise LookupError("object_not_found")
        rev = str(getattr(row, "updated_at", None) or getattr(row, "created_at", "") or row.id)
        if object_revision and object_revision != rev and object_revision != str(row.id):
            return {"ok": True, "revision_match": False, "safe_mode": "SAFE_REVIEW"}
        return {"ok": True, "revision_match": True, "safe_mode": "EXACT"}

    if object_kind == "data_trust_review":
        row = (
            db.query(CandidateDataTrustReview)
            .filter(
                CandidateDataTrustReview.candidate_id == candidate_id,
                CandidateDataTrustReview.review_key == object_ref,
                CandidateDataTrustReview.deleted_at.is_(None),
            )
            .one_or_none()
        )
        if row is None:
            raise LookupError("object_not_found")
        rev = str(getattr(row, "updated_at", None) or row.id)
        if object_revision and object_revision not in {rev, str(row.id)}:
            return {"ok": True, "revision_match": False, "safe_mode": "SAFE_REVIEW"}
        return {"ok": True, "revision_match": True, "safe_mode": "EXACT"}

    if object_kind == "opportunity":
        try:
            oid = int(object_ref)
        except ValueError as exc:
            raise LookupError("object_not_found") from exc
        row = (
            db.query(CandidateNormalizedOpportunity)
            .filter(
                CandidateNormalizedOpportunity.id == oid,
                CandidateNormalizedOpportunity.candidate_id == candidate_id,
                CandidateNormalizedOpportunity.deleted_at.is_(None),
            )
            .one_or_none()
        )
        if row is None:
            raise LookupError("object_not_found")
        return {"ok": True, "revision_match": True, "safe_mode": "EXACT"}

    if object_kind == "app_studio_workspace":
        try:
            wid = int(object_ref)
        except ValueError as exc:
            raise LookupError("object_not_found") from exc
        row = (
            db.query(CandidateAppStudioWorkspace)
            .filter(
                CandidateAppStudioWorkspace.id == wid,
                CandidateAppStudioWorkspace.candidate_id == candidate_id,
            )
            .one_or_none()
        )
        if row is None or getattr(row, "deleted_at", None):
            raise LookupError("object_not_found")
        rev = str(getattr(row, "updated_at", None) or row.id)
        if object_revision and object_revision not in {rev, str(row.id)}:
            return {"ok": True, "revision_match": False, "safe_mode": "SAFE_REVIEW"}
        return {"ok": True, "revision_match": True, "safe_mode": "EXACT"}

    if object_kind == "career_pack":
        row = (
            db.query(CandidateCareerPack)
            .filter(
                CandidateCareerPack.candidate_id == candidate_id,
                CandidateCareerPack.pack_key == object_ref,
                CandidateCareerPack.deleted_at.is_(None),
            )
            .one_or_none()
        )
        if row is None:
            raise LookupError("object_not_found")
        rev = row.snapshot_hash or str(row.id)
        if object_revision and object_revision != rev:
            return {"ok": True, "revision_match": False, "safe_mode": "SAFE_REVIEW"}
        return {"ok": True, "revision_match": True, "safe_mode": "EXACT"}

    raise ValueError("unsupported_object_kind")


def _continuity_hint(db: Session, *, candidate_id: int, flow_kind: str | None) -> dict[str, Any] | None:
    if not flow_kind:
        return None
    try:
        from app.services import candidate_journey_continuity as cjc

        cont = cjc.list_continue(db, candidate_id=candidate_id)
        items = (cont or {}).get("items") or []
        for it in items:
            if isinstance(it, dict) and it.get("flow_kind") == flow_kind:
                return {
                    "prefer_continuity": True,
                    "flow_kind": flow_kind,
                    "session_key": it.get("session_key"),
                    "note": "Use Journey Continuity Continue for persistent saved flow",
                }
    except Exception:
        return None
    return {"prefer_continuity": False, "flow_kind": flow_kind}


def create_handoff(
    db: Session,
    *,
    user: User,
    candidate_id: int,
    handoff_id: str,
    object_ref: str,
    object_revision: str | None = None,
    parent_handle: str | None = None,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> dict[str, Any]:
    meta = HANDOFF_REGISTRY.get(handoff_id)
    if meta is None:
        raise ValueError("handoff_not_allowlisted")
    if not object_ref or len(object_ref) > 128:
        raise ValueError("invalid_object_ref")
    ttl = max(60, min(int(ttl_seconds), MAX_TTL_SECONDS))
    depth = 1
    parent_digest = None
    if parent_handle:
        parent = _decode(parent_handle, candidate_id=candidate_id, user_id=user.id)
        depth = int(parent.get("depth") or 1) + 1
        if depth > MAX_DEPTH:
            raise ValueError("max_depth_exceeded")
        parent_digest = _digest(parent_handle)

    check = _verify_object(
        db,
        candidate_id=candidate_id,
        object_kind=meta["object_kind"],
        object_ref=object_ref.strip(),
        object_revision=object_revision,
    )
    now = int(time.time())
    payload = {
        "v": 1,
        "schema_id": CONTEXT_SCHEMA_ID,
        "candidate_id": candidate_id,
        "user_id": user.id,
        "handoff_id": handoff_id,
        "source_route_key": meta["source_route_key"],
        "dest_route_key": meta["dest_route_key"],
        "return_route_key": meta["return_route_key"],
        "object_kind": meta["object_kind"],
        "object_ref": object_ref.strip(),
        "object_revision": object_revision,
        "depth": depth,
        "parent_handle_digest": parent_digest,
        "iat": now,
        "exp": now + ttl,
        "safe_mode": check.get("safe_mode"),
    }
    handle = encrypt_secret(json.dumps(payload, separators=(",", ":")))
    continuity = _continuity_hint(
        db, candidate_id=candidate_id, flow_kind=meta.get("prefer_continuity_flow")
    )
    return {
        "schema_id": CONTEXT_SCHEMA_ID,
        "created": True,
        "handle_once": handle,
        "handoff_id": handoff_id,
        "dest_href": ROUTE_KEYS[meta["dest_route_key"]],
        "return_href": ROUTE_KEYS[meta["return_route_key"]],
        "ttl_seconds": ttl,
        "depth": depth,
        "expires_at_unix": payload["exp"],
        "continuity": continuity,
        "mutations": False,
        "authorization": False,
        "first_value_satisfied": False,
        "raw_context_in_url": False,
    }


def _decode(handle: str, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    try:
        raw = decrypt_secret(handle.strip())
        data = json.loads(raw)
    except (InvalidToken, json.JSONDecodeError, ValueError, TypeError) as exc:
        raise LookupError("unavailable") from exc
    if not isinstance(data, dict):
        raise LookupError("unavailable")
    if int(data.get("candidate_id") or -1) != candidate_id:
        raise LookupError("unavailable")
    if int(data.get("user_id") or -1) != user_id:
        raise LookupError("unavailable")
    now = int(time.time())
    if int(data.get("exp") or 0) < now:
        raise LookupError("expired")
    if int(data.get("iat") or 0) > now + 60:
        raise LookupError("unavailable")
    hid = data.get("handoff_id")
    if hid not in HANDOFF_REGISTRY:
        raise LookupError("unavailable")
    if int(data.get("depth") or 1) > MAX_DEPTH:
        raise LookupError("unavailable")
    return data


def resolve_handoff(
    db: Session,
    *,
    user: User,
    candidate_id: int,
    handle: str,
    expected_dest_route_key: str | None = None,
) -> dict[str, Any]:
    data = _decode(handle, candidate_id=candidate_id, user_id=user.id)
    meta = HANDOFF_REGISTRY[data["handoff_id"]]
    if expected_dest_route_key and expected_dest_route_key != meta["dest_route_key"]:
        raise ValueError("dest_mismatch")
    check = _verify_object(
        db,
        candidate_id=candidate_id,
        object_kind=str(data["object_kind"]),
        object_ref=str(data["object_ref"]),
        object_revision=data.get("object_revision"),
    )
    continuity = _continuity_hint(
        db, candidate_id=candidate_id, flow_kind=meta.get("prefer_continuity_flow")
    )
    return {
        "schema_id": CONTEXT_SCHEMA_ID,
        "ok": True,
        "handoff_id": data["handoff_id"],
        "label": meta["label"],
        "source_route_key": meta["source_route_key"],
        "dest_route_key": meta["dest_route_key"],
        "return_route_key": meta["return_route_key"],
        "source_href": ROUTE_KEYS[meta["source_route_key"]],
        "dest_href": ROUTE_KEYS[meta["dest_route_key"]],
        "return_href": ROUTE_KEYS[meta["return_route_key"]],
        "object_kind": data["object_kind"],
        "object_ref": data["object_ref"],
        "object_revision": data.get("object_revision"),
        "depth": data.get("depth"),
        "expires_at_unix": data.get("exp"),
        "ownership_ok": True,
        "revision_match": check.get("revision_match"),
        "safe_mode": check.get("safe_mode"),
        "continuity": continuity,
        "authorization": False,
        "mutations": False,
        "next_best_action": False,
        "urgency_score": None,
        "first_value_satisfied": False,
        "banner": {
            "show": True,
            "return_label": "Return",
            "cancel_label": "Dismiss",
        },
    }
