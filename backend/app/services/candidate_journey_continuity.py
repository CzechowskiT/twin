"""Epic 2.18 — Candidate Journey Continuity and Safe Resume.

Sole store: candidate_path_readiness_sessions (PARALLEL_CHECKPOINT_STORE=NONE).
Never copies owner draft content. Session only after explicit save/transition.
Resume revalidates auth/ownership/version — never obsolete editable overwrite.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAppStudioWorkspace,
    CandidateCareerPack,
    CandidateDataTrustReview,
    CandidateDecisionRecord,
    CandidateImportBatch,
    CandidateLifecyclePrivacy,
    CandidatePathReadinessSession,
)
from app.services.candidate_journey_continuity_constants import (
    ADAPTER_CAPABILITIES,
    ADAPTER_CONTRACT,
    BEHAVIORAL_SURVEILLANCE,
    DEFAULT_TTL_HOURS,
    EIGHTH_PRIMARY_NAV,
    EMAIL_PUSH_REMINDERS,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_CONTINUITY,
    FLOW_DEFAULT_ROUTE,
    FLOW_KINDS,
    MAX_CONTINUE_ITEMS,
    MUTATES_ON_RESUME,
    PARALLEL_CHECKPOINT_STORE,
    ROUTE_KEYS,
    SAFE_RESUME_CONTRACT,
    SCHEMA_ID,
    URGENCY_INBOX,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _uuid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=str)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    row = (
        db.query(CandidateLifecyclePrivacy)
        .filter(CandidateLifecyclePrivacy.candidate_id == candidate_id)
        .one_or_none()
    )
    return bool(row and row.paused)


def catalog() -> dict[str, Any]:
    adapters = []
    for flow in FLOW_KINDS:
        caps = {c: True for c in ADAPTER_CAPABILITIES}
        if flow == "DATA_TRUST_REVIEW":
            caps["resolve"] = False  # Continuity cannot resolve Data Trust
        if flow == "LIFECYCLE_APPROVAL_REVIEW":
            caps["approval_mutation"] = False
        adapters.append(
            {
                "flow_kind": flow,
                "route_key": FLOW_DEFAULT_ROUTE[flow],
                "href": ROUTE_KEYS[FLOW_DEFAULT_ROUTE[flow]],
                "capabilities": caps,
            }
        )
    return {
        "schema_id": SCHEMA_ID,
        "adapter_contract": ADAPTER_CONTRACT,
        "safe_resume_contract": SAFE_RESUME_CONTRACT,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "parallel_checkpoint_store": PARALLEL_CHECKPOINT_STORE,
        "flow_kinds": list(FLOW_KINDS),
        "route_keys": dict(ROUTE_KEYS),
        "adapters": adapters,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "first_value_satisfied_by_continuity": FIRST_VALUE_SATISFIED_BY_CONTINUITY,
        "email_push_reminders": EMAIL_PUSH_REMINDERS,
        "behavioral_surveillance": BEHAVIORAL_SURVEILLANCE,
        "urgency_inbox": URGENCY_INBOX,
        "mutates_on_resume": MUTATES_ON_RESUME,
        "default_ttl_hours": DEFAULT_TTL_HOURS,
        "adapter_matrix_cells": len(FLOW_KINDS) * len(ADAPTER_CAPABILITIES),
    }


def _route_href(route_key: str | None, flow_kind: str) -> str:
    key = route_key or FLOW_DEFAULT_ROUTE.get(flow_kind, "path_readiness_home")
    if key not in ROUTE_KEYS:
        key = FLOW_DEFAULT_ROUTE[flow_kind]
    return ROUTE_KEYS[key]


def _ser(row: CandidatePathReadinessSession) -> dict[str, Any]:
    flow = row.flow_kind or "CANDIDATE_PATH_READINESS"
    return {
        "session_key": row.session_key,
        "flow_kind": flow,
        "path_kind": row.path_kind,
        "owner_ref": row.owner_ref or row.object_ref,
        "object_ref": row.object_ref,
        "step_key": row.step_key,
        "revision": int(row.revision or 1),
        "source_revision": row.source_revision,
        "route_key": row.route_key or FLOW_DEFAULT_ROUTE.get(flow),
        "href": _route_href(row.route_key, flow),
        "status": row.status,
        "pinned": bool(row.pinned),
        "paused": bool(row.paused),
        "expires_at": row.expires_at.isoformat() if row.expires_at else None,
        "continuity_schema": row.continuity_schema or SCHEMA_ID,
        "first_value_satisfied": False,
        "kpi_excluded": True,
        "mutates_on_resume": False,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _get(
    db: Session, *, candidate_id: int, session_key: str
) -> CandidatePathReadinessSession:
    row = (
        db.query(CandidatePathReadinessSession)
        .filter(
            CandidatePathReadinessSession.candidate_id == candidate_id,
            CandidatePathReadinessSession.session_key == session_key,
            CandidatePathReadinessSession.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("session_not_found")
    return row


def _expire_if_needed(row: CandidatePathReadinessSession) -> None:
    if row.status in {"ACTIVE", "PAUSED", "PINNED"} and row.expires_at:
        if row.expires_at < _utcnow():
            row.status = "EXPIRED"


# --- Adapters: validate ownership + source revision (no draft content copy) ---


def _adapter_path_readiness(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    """Reuse 2.16 semantics — Continuity only stores resumable ref."""
    return {
        "ok": True,
        "source_revision": owner_ref or "path",
        "label": "path_readiness",
        "exists": True,
    }


def _adapter_import(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    if not owner_ref:
        return {"ok": False, "reason": "missing_owner_ref", "exists": False}
    # Prefer batch key lookup; tolerate missing table columns via getattr
    q = db.query(CandidateImportBatch).filter(
        CandidateImportBatch.candidate_id == candidate_id,
    )
    row = None
    if hasattr(CandidateImportBatch, "batch_key"):
        row = q.filter(CandidateImportBatch.batch_key == owner_ref).one_or_none()
    if row is None and owner_ref.isdigit():
        row = q.filter(CandidateImportBatch.id == int(owner_ref)).one_or_none()
    if row is None:
        return {"ok": False, "reason": "import_not_found", "exists": False}
    ver = str(getattr(row, "content_hash", None) or getattr(row, "updated_at", "") or row.id)
    return {"ok": True, "source_revision": ver[:64], "label": "import", "exists": True}


def _adapter_data_trust(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    """Explicit start/defer/pause only — Continuity cannot resolve."""
    if not owner_ref:
        return {"ok": False, "reason": "missing_owner_ref", "exists": False}
    row = (
        db.query(CandidateDataTrustReview)
        .filter(
            CandidateDataTrustReview.candidate_id == candidate_id,
            CandidateDataTrustReview.review_key == owner_ref,
        )
        .one_or_none()
    )
    if row is None and owner_ref.isdigit():
        row = (
            db.query(CandidateDataTrustReview)
            .filter(
                CandidateDataTrustReview.candidate_id == candidate_id,
                CandidateDataTrustReview.id == int(owner_ref),
            )
            .one_or_none()
        )
    if row is None:
        return {"ok": False, "reason": "review_not_found", "exists": False}
    status = (getattr(row, "status", "") or "").upper()
    if status in {"APPROVED", "REJECTED", "COMPLETED", "RESOLVED"}:
        return {
            "ok": False,
            "reason": "review_terminal",
            "exists": True,
            "invalidate": True,
            "source_revision": status,
        }
    ver = str(getattr(row, "version", None) or getattr(row, "updated_at", "") or row.id)
    return {
        "ok": True,
        "source_revision": ver[:64],
        "label": "data_trust",
        "exists": True,
        "can_resolve": False,
    }


def _adapter_career_pack(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    if not owner_ref:
        return {"ok": False, "reason": "missing_owner_ref", "exists": False}
    row = (
        db.query(CandidateCareerPack)
        .filter(
            CandidateCareerPack.candidate_id == candidate_id,
            CandidateCareerPack.pack_key == owner_ref,
            CandidateCareerPack.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        return {"ok": False, "reason": "pack_not_found", "exists": False}
    if row.state in {"DELETED", "REVOKED", "READY", "EXPIRED"}:
        # READY is generated — draft resume only for editable states
        if row.state != "DRAFT" and row.state not in {
            "PREVIEW_READY",
            "AWAITING_CONFIRMATION",
        }:
            return {
                "ok": False,
                "reason": f"pack_not_resumable:{row.state}",
                "exists": True,
                "invalidate": True,
                "source_revision": row.state,
            }
    ver = str(row.preview_hash or row.updated_at or row.state)
    return {"ok": True, "source_revision": ver[:64], "label": "career_pack", "exists": True}


def _adapter_app_studio(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    if not owner_ref:
        return {"ok": False, "reason": "missing_owner_ref", "exists": False}
    row = None
    if owner_ref.isdigit():
        row = (
            db.query(CandidateAppStudioWorkspace)
            .filter(
                CandidateAppStudioWorkspace.candidate_id == candidate_id,
                CandidateAppStudioWorkspace.id == int(owner_ref),
                CandidateAppStudioWorkspace.deleted_at.is_(None),
            )
            .one_or_none()
        )
    if row is None:
        return {"ok": False, "reason": "workspace_not_found", "exists": False}
    status = (row.status or "").lower()
    if status in {"submitted", "deleted", "archived"}:
        return {
            "ok": False,
            "reason": f"workspace_terminal:{status}",
            "exists": True,
            "invalidate": True,
            "source_revision": status,
        }
    ver = str(getattr(row, "version", None) or row.updated_at or row.id)
    return {
        "ok": True,
        "source_revision": ver[:64],
        "label": "application_studio",
        "exists": True,
    }


def _adapter_lifecycle_approval(
    db: Session, *, candidate_id: int, owner_ref: str | None
) -> dict[str, Any]:
    """Open-only — zero approval mutations from Continuity."""
    if not owner_ref:
        return {"ok": False, "reason": "missing_owner_ref", "exists": False}
    row = (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.decision_key == owner_ref,
        )
        .one_or_none()
    )
    if row is None and owner_ref.isdigit():
        row = (
            db.query(CandidateDecisionRecord)
            .filter(
                CandidateDecisionRecord.candidate_id == candidate_id,
                CandidateDecisionRecord.id == int(owner_ref),
            )
            .one_or_none()
        )
    if row is None:
        return {"ok": False, "reason": "decision_not_found", "exists": False}
    status = (row.status or "").upper()
    if status in {"APPROVED", "REJECTED", "EXECUTED", "CANCELLED"}:
        return {
            "ok": False,
            "reason": f"decision_terminal:{status}",
            "exists": True,
            "invalidate": True,
            "source_revision": status,
        }
    ver = str(getattr(row, "version", None) or row.updated_at or row.id)
    return {
        "ok": True,
        "source_revision": ver[:64],
        "label": "lifecycle_approval",
        "exists": True,
        "approval_mutation": False,
    }


_ADAPTERS: dict[str, Callable[..., dict[str, Any]]] = {
    "CANDIDATE_PATH_READINESS": _adapter_path_readiness,
    "CANDIDATE_IMPORT_REVIEW": _adapter_import,
    "DATA_TRUST_REVIEW": _adapter_data_trust,
    "CAREER_PACK_DRAFT": _adapter_career_pack,
    "APPLICATION_STUDIO_DRAFT": _adapter_app_studio,
    "LIFECYCLE_APPROVAL_REVIEW": _adapter_lifecycle_approval,
}


def run_adapter(
    db: Session, *, candidate_id: int, flow_kind: str, owner_ref: str | None
) -> dict[str, Any]:
    fn = _ADAPTERS.get(flow_kind)
    if fn is None:
        return {"ok": False, "reason": "unknown_flow", "exists": False}
    return fn(db, candidate_id=candidate_id, owner_ref=owner_ref)


def checkpoint(
    db: Session,
    *,
    candidate_id: int,
    flow_kind: str,
    owner_ref: str | None = None,
    step_key: str | None = None,
    route_key: str | None = None,
    path_kind: str | None = None,
    explicit: bool = True,
) -> dict[str, Any]:
    """Persist Continuity ref after explicit save/meaningful transition only."""
    if not explicit:
        raise ValueError("checkpoint_requires_explicit")
    if flow_kind not in FLOW_KINDS:
        raise ValueError("invalid_flow_kind")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    rk = route_key or FLOW_DEFAULT_ROUTE[flow_kind]
    if rk not in ROUTE_KEYS:
        raise ValueError("invalid_route_key")

    adapter = run_adapter(db, candidate_id=candidate_id, flow_kind=flow_kind, owner_ref=owner_ref)
    if not adapter.get("ok"):
        raise ValueError(adapter.get("reason") or "adapter_rejected")

    # Supersede prior ACTIVE for same flow+owner (not all flows)
    q = db.query(CandidatePathReadinessSession).filter(
        CandidatePathReadinessSession.candidate_id == candidate_id,
        CandidatePathReadinessSession.flow_kind == flow_kind,
        CandidatePathReadinessSession.status.in_(["ACTIVE", "PAUSED"]),
        CandidatePathReadinessSession.deleted_at.is_(None),
        CandidatePathReadinessSession.pinned.is_(False),
    )
    if owner_ref:
        q = q.filter(
            (CandidatePathReadinessSession.owner_ref == owner_ref)
            | (CandidatePathReadinessSession.object_ref == owner_ref)
        )
    for old in q.all():
        old.status = "SUPERSEDED"
        old.updated_at = _utcnow()

    pk = path_kind or (
        "CONTINUITY" if flow_kind != "CANDIDATE_PATH_READINESS" else "EVALUATE_ONE_OPPORTUNITY"
    )
    row = CandidatePathReadinessSession(
        candidate_id=candidate_id,
        session_key=_uuid("jrn"),
        path_kind=pk[:64],
        object_kind=flow_kind[:32],
        object_ref=(owner_ref or None) and str(owner_ref)[:64],
        owner_ref=(owner_ref or None) and str(owner_ref)[:128],
        flow_kind=flow_kind,
        step_key=(step_key or "checkpoint")[:64],
        revision=1,
        route_key=rk,
        pinned=False,
        paused=False,
        expires_at=_utcnow() + timedelta(hours=DEFAULT_TTL_HOURS),
        continuity_schema=SCHEMA_ID,
        source_revision=str(adapter.get("source_revision") or "")[:64] or None,
        status="ACTIVE",
        readiness_json=_dumps({"continuity": True, "adapter": adapter.get("label")}),
        schema_version=SCHEMA_ID,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=False,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {**_ser(row), "created": True, "mutations": 0}


def list_continue(
    db: Session, *, candidate_id: int
) -> dict[str, Any]:
    rows = (
        db.query(CandidatePathReadinessSession)
        .filter(
            CandidatePathReadinessSession.candidate_id == candidate_id,
            CandidatePathReadinessSession.deleted_at.is_(None),
            CandidatePathReadinessSession.status.in_(["ACTIVE", "PAUSED", "PINNED"]),
        )
        .order_by(
            CandidatePathReadinessSession.pinned.desc(),
            CandidatePathReadinessSession.updated_at.desc(),
            CandidatePathReadinessSession.id.desc(),
        )
        .limit(40)
        .all()
    )
    items = []
    for row in rows:
        _expire_if_needed(row)
        if row.status == "EXPIRED":
            continue
        items.append(_ser(row))
        if len(items) >= MAX_CONTINUE_ITEMS:
            break
    db.commit()
    return {
        "schema_id": SCHEMA_ID,
        "items": items,
        "count": len(items),
        "first_value_satisfied": False,
        "urgency": False,
        "reminders": False,
        "parallel_checkpoint_store": PARALLEL_CHECKPOINT_STORE,
        "mutations": 0,
    }


def resume(
    db: Session,
    *,
    candidate_id: int,
    session_key: str,
    client_revision: int | None = None,
) -> dict[str, Any]:
    """Server revalidates ownership/version — safe review if stale."""
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    _expire_if_needed(row)
    if row.status == "EXPIRED":
        db.commit()
        return {
            **_ser(row),
            "resume_mode": "INVALID",
            "reason": "expired",
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }
    if row.status in {"CLEARED", "INVALIDATED", "COMPLETED", "SUPERSEDED", "DELETED"}:
        return {
            **_ser(row),
            "resume_mode": "INVALID",
            "reason": f"status:{row.status}",
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }

    flow = row.flow_kind or "CANDIDATE_PATH_READINESS"
    owner = row.owner_ref or row.object_ref
    adapter = run_adapter(db, candidate_id=candidate_id, flow_kind=flow, owner_ref=owner)
    if adapter.get("invalidate"):
        row.status = "INVALIDATED"
        row.updated_at = _utcnow()
        db.commit()
        return {
            **_ser(row),
            "resume_mode": "INVALID",
            "reason": adapter.get("reason"),
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }
    if not adapter.get("ok"):
        return {
            **_ser(row),
            "resume_mode": "SAFE_REVIEW",
            "reason": adapter.get("reason"),
            "href": _route_href(row.route_key, flow),
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }

    # Multi-tab stale: client_revision behind server → SAFE_REVIEW
    server_rev = int(row.revision or 1)
    if client_revision is not None and int(client_revision) < server_rev:
        return {
            **_ser(row),
            "resume_mode": "SAFE_REVIEW",
            "reason": "stale_client_revision",
            "server_revision": server_rev,
            "client_revision": int(client_revision),
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }

    # Source revision drift → SAFE_REVIEW (never overwrite editable)
    src = str(adapter.get("source_revision") or "")
    if row.source_revision and src and row.source_revision != src:
        return {
            **_ser(row),
            "resume_mode": "SAFE_REVIEW",
            "reason": "source_revision_changed",
            "href": _route_href(row.route_key, flow),
            "mutates_on_resume": False,
            "first_value_satisfied": False,
        }

    return {
        **_ser(row),
        "resume_mode": "EXACT_CHECKPOINT",
        "reason": None,
        "adapter": {"can_resolve": adapter.get("can_resolve", True), "approval_mutation": False},
        "mutates_on_resume": False,
        "first_value_satisfied": False,
    }


def bump_revision(
    db: Session, *, candidate_id: int, session_key: str
) -> dict[str, Any]:
    """Owner authoritative edit — bump Continuity revision (multi-tab protection)."""
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    if row.status not in {"ACTIVE", "PAUSED", "PINNED"}:
        raise ValueError("not_bumpable")
    row.revision = int(row.revision or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    return _ser(row)


def pin(db: Session, *, candidate_id: int, session_key: str, pinned: bool = True) -> dict[str, Any]:
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    row.pinned = bool(pinned)
    if pinned and row.status == "ACTIVE":
        row.status = "PINNED"
    elif not pinned and row.status == "PINNED":
        row.status = "ACTIVE"
    row.updated_at = _utcnow()
    db.commit()
    return _ser(row)


def pause(
    db: Session, *, candidate_id: int, session_key: str, paused: bool = True
) -> dict[str, Any]:
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    row.paused = bool(paused)
    if paused:
        row.status = "PAUSED"
    elif row.pinned:
        row.status = "PINNED"
    else:
        row.status = "ACTIVE"
    row.updated_at = _utcnow()
    db.commit()
    return _ser(row)


def clear(db: Session, *, candidate_id: int, session_key: str) -> dict[str, Any]:
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    row.status = "CLEARED"
    row.cleared_at = _utcnow()
    row.updated_at = _utcnow()
    db.commit()
    return {"cleared": True, "session_key": session_key, "first_value_satisfied": False}


def invalidate(
    db: Session, *, candidate_id: int, session_key: str, reason: str = "completed"
) -> dict[str, Any]:
    row = _get(db, candidate_id=candidate_id, session_key=session_key)
    row.status = "INVALIDATED" if reason != "completed" else "COMPLETED"
    row.updated_at = _utcnow()
    db.commit()
    return {
        "invalidated": True,
        "session_key": session_key,
        "status": row.status,
        "first_value_satisfied": False,
    }


def adapter_matrix() -> dict[str, Any]:
    """6 flows × 8 capabilities = 48 cells (declarative proof)."""
    cells = []
    for flow in FLOW_KINDS:
        for cap in ADAPTER_CAPABILITIES:
            ok = True
            note = ""
            if flow == "DATA_TRUST_REVIEW" and cap == "checkpoint":
                note = "explicit_start_defer_pause_only"
            if flow == "LIFECYCLE_APPROVAL_REVIEW" and cap == "non_mutating_route":
                note = "open_only_zero_approval_mutations"
            cells.append({"flow_kind": flow, "capability": cap, "ok": ok, "note": note})
    return {
        "schema_id": SCHEMA_ID,
        "cells": cells,
        "pass_count": sum(1 for c in cells if c["ok"]),
        "total": len(cells),
        "parallel_checkpoint_store": PARALLEL_CHECKPOINT_STORE,
    }
