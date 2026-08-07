"""Epic 2.14 — canonical first-value ladder on pilot_first_value_v1 (no v2).

READY → VIEWED → ACKNOWLEDGED → ACTIONED
Route visit / account create / import alone do NOT satisfy ACTIONED.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateGuidedFirstValue
from app.services import guided_first_value as gfv
from app.services import pilot_metric_contracts as metrics

LADDER = ("READY", "VIEWED", "ACKNOWLEDGED", "ACTIONED")
LADDER_RANK = {name: i for i, name in enumerate(LADDER)}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _ensure(db: Session, *, candidate_id: int, user_id: int) -> CandidateGuidedFirstValue:
    return gfv._ensure(db, candidate_id=candidate_id, user_id=user_id)  # noqa: SLF001


def ladder_status(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    # Columns may be missing before migration on old sessions — getattr safe
    ladder = getattr(row, "fv_ladder", None) or "READY"
    if ladder not in LADDER_RANK:
        ladder = "READY"
    derived = {}
    try:
        derived = metrics.derive_first_value(db, user_id=user_id, candidate_id=candidate_id)
    except Exception:
        derived = {}
    return {
        "schema": "twin.first_value_ladder/v1",
        "contract_id": "pilot_first_value_v1",
        "ladder": ladder,
        "viewed_at": getattr(row, "fv_viewed_at", None).isoformat()
        if getattr(row, "fv_viewed_at", None)
        else None,
        "acknowledged_at": getattr(row, "fv_acknowledged_at", None).isoformat()
        if getattr(row, "fv_acknowledged_at", None)
        else None,
        "actioned_at": getattr(row, "fv_actioned_at", None).isoformat()
        if getattr(row, "fv_actioned_at", None)
        else None,
        "real_first_value_reached": bool(row.real_first_value_reached),
        "demo_first_value_seen": bool(row.demo_first_value_seen),
        "not_sufficient": [
            "route_visit_alone",
            "account_create_alone",
            "import_upload_alone",
            "search_alone",
            "onboarding_skip_alone",
        ],
        "derived": derived if isinstance(derived, dict) else {},
        "claim_kind": "FACT",
        "kpi_excluded": bool(getattr(row, "kpi_excluded", True)),
    }


def advance_ladder(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    target: str,
    lane: str = "SYNTHETIC",
) -> dict[str, Any]:
    tgt = (target or "").strip().upper()
    if tgt not in LADDER_RANK:
        raise ValueError("invalid_ladder_target")
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    current = getattr(row, "fv_ladder", None) or "READY"
    if current not in LADDER_RANK:
        current = "READY"
    # Only advance forward (idempotent if same/lower)
    if LADDER_RANK[tgt] < LADDER_RANK[current]:
        return ladder_status(db, candidate_id=candidate_id, user_id=user_id)

    now = _utcnow()
    if tgt == "VIEWED" and LADDER_RANK[current] < LADDER_RANK["VIEWED"]:
        row.fv_ladder = "VIEWED"
        row.fv_viewed_at = now
    elif tgt == "ACKNOWLEDGED" and LADDER_RANK[current] < LADDER_RANK["ACKNOWLEDGED"]:
        if LADDER_RANK[current] < LADDER_RANK["VIEWED"]:
            row.fv_viewed_at = row.fv_viewed_at or now
        row.fv_ladder = "ACKNOWLEDGED"
        row.fv_acknowledged_at = now
    elif tgt == "ACTIONED":
        # ACTIONED requires ACK first (or jump with prior steps filled)
        if LADDER_RANK[current] < LADDER_RANK["VIEWED"]:
            row.fv_viewed_at = row.fv_viewed_at or now
        if LADDER_RANK[current] < LADDER_RANK["ACKNOWLEDGED"]:
            row.fv_acknowledged_at = row.fv_acknowledged_at or now
        row.fv_ladder = "ACTIONED"
        row.fv_actioned_at = now
        # Only mark real_first_value_reached for REAL lane; synthetic stays excluded
        if (lane or "").upper() == "REAL":
            row.real_first_value_reached = True
        # Guided complete when actioned
        if row.state not in {"COMPLETED", "SKIPPED", "DELETED"}:
            row.state = "COMPLETED"
            row.completed_at = now
    elif tgt == "READY":
        row.fv_ladder = "READY"

    row.updated_at = now
    db.commit()
    db.refresh(row)
    return ladder_status(db, candidate_id=candidate_id, user_id=user_id)
