"""Epic 2.11 — Guided First Value entry, starter paths, and progress states.

Integrity of real first value remains pilot_first_value_v1 only (no v2).
demo_first_value_seen is separate from real_first_value_reached.
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateGuidedFirstValue
from app.services import pilot_metric_contracts as metrics

SCHEMA = "twin.guided_first_value/v1"
# Epic 2.11 alignment marker 2026-08-06
CONTRACT_ID = "starter_path_v1"

STATES = frozenset(
    {
        "NOT_STARTED",
        "ENTRY_SHOWN",
        "IN_PROGRESS",
        "PAUSED",
        "COMPLETED",
        "SKIPPED",
        "DELETED",
    }
)

ENTRY_CHOICES = frozenset(
    {
        "EXPLORE_SAFE_DEMO",
        "START_WITH_MY_DATA",
        "RESUME_EXISTING_SETUP",
    }
)

STARTER_PATHS = frozenset(
    {
        "direction",
        "first_evidence",
        "opportunity_review",
        "organize_current_actions",
    }
)

STARTER_PATH_META = {
    "direction": {
        "href": "/dashboard/career",
        "requires_cv": False,
        "requires_ms_calendar": False,
        "ia_area": "direction",
    },
    "first_evidence": {
        "href": "/dashboard/portfolio",
        "requires_cv": False,
        "requires_ms_calendar": False,
        "ia_area": "evidence",
    },
    "opportunity_review": {
        "href": "/dashboard/matches",
        "requires_cv": False,
        "requires_ms_calendar": False,
        "ia_area": "opportunities",
    },
    "organize_current_actions": {
        "href": "/dashboard/execution-calendar",
        "requires_cv": False,
        "requires_ms_calendar": False,
        "ia_area": "plan",
    },
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _row(db: Session, *, candidate_id: int) -> CandidateGuidedFirstValue | None:
    return (
        db.query(CandidateGuidedFirstValue)
        .filter(
            CandidateGuidedFirstValue.candidate_id == candidate_id,
            CandidateGuidedFirstValue.deleted_at.is_(None),
        )
        .one_or_none()
    )


def _ensure(db: Session, *, candidate_id: int, user_id: int) -> CandidateGuidedFirstValue:
    row = _row(db, candidate_id=candidate_id)
    if row is not None:
        return row
    row = CandidateGuidedFirstValue(
        candidate_id=candidate_id,
        user_id=user_id,
        state="NOT_STARTED",
        progress_json="{}",
        demo_first_value_seen=False,
        real_first_value_reached=False,
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _progress(row: CandidateGuidedFirstValue) -> dict[str, Any]:
    try:
        data = json.loads(row.progress_json or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _out(row: CandidateGuidedFirstValue, *, first_value: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "state": row.state,
        "entry_choice": row.entry_choice,
        "starter_path": row.starter_path,
        "progress": _progress(row),
        "demo_first_value_seen": bool(row.demo_first_value_seen),
        "real_first_value_reached": bool(row.real_first_value_reached),
        "first_value_contract": "pilot_first_value_v1",
        "server_first_value": first_value,
        "skippable": True,
        "pausable": True,
        "resumable": True,
        "guilt_free": True,
        "no_scores": True,
        "requires_cv": False,
        "requires_ms_calendar": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def get_status(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    fv = metrics.derive_first_value(db, user_id=user_id, candidate_id=candidate_id)
    # Mirror server derivation into row without inventing v2
    if fv.get("reached") and not row.real_first_value_reached:
        row.real_first_value_reached = True
        row.updated_at = _utcnow()
        db.commit()
        db.refresh(row)
    return _out(row, first_value=fv)


def choose_entry(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    choice: str,
) -> dict[str, Any]:
    if choice not in ENTRY_CHOICES:
        return {"ok": False, "reason": "invalid_entry_choice", "kpi_excluded": True}
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    if row.state == "DELETED":
        return {"ok": False, "reason": "deleted", "kpi_excluded": True}
    row.entry_choice = choice
    row.state = "IN_PROGRESS" if choice != "RESUME_EXISTING_SETUP" else "IN_PROGRESS"
    if choice == "EXPLORE_SAFE_DEMO":
        prog = _progress(row)
        prog["demo_mode"] = True
        row.progress_json = json.dumps(prog)
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, **_out(row)}


def select_starter_path(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    path: str,
) -> dict[str, Any]:
    if path not in STARTER_PATHS:
        return {"ok": False, "reason": "invalid_starter_path", "kpi_excluded": True}
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    meta = STARTER_PATH_META[path]
    row.starter_path = path
    row.state = "IN_PROGRESS"
    prog = _progress(row)
    prog["starter_path"] = path
    prog["href"] = meta["href"]
    prog["idempotent_key"] = prog.get("idempotent_key") or secrets.token_hex(8)
    row.progress_json = json.dumps(prog)
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, "meta": meta, **_out(row)}


def pause(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    if row.state in ("COMPLETED", "SKIPPED", "DELETED"):
        return {"ok": False, "reason": "terminal_state", **_out(row)}
    row.state = "PAUSED"
    row.paused_at = _utcnow()
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, **_out(row)}


def resume(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    if row.state == "DELETED":
        return {"ok": False, "reason": "deleted", **_out(row)}
    row.state = "IN_PROGRESS"
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, **_out(row)}


def skip(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    row.state = "SKIPPED"
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, **_out(row)}


def mark_demo_first_value_seen(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    """Demo insight seen — never sets real_first_value_reached."""
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    row.demo_first_value_seen = True
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, "demo_first_value_seen": True, "real_first_value_reached": bool(row.real_first_value_reached), **_out(row)}


def complete_starter(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    """Idempotent completion of guided starter UI — does not invent first-value v2."""
    row = _ensure(db, candidate_id=candidate_id, user_id=user_id)
    if row.state != "COMPLETED":
        row.state = "COMPLETED"
        row.completed_at = _utcnow()
        row.updated_at = _utcnow()
        db.commit()
        db.refresh(row)
    fv = metrics.derive_first_value(db, user_id=user_id, candidate_id=candidate_id)
    if fv.get("reached") and not row.real_first_value_reached:
        row.real_first_value_reached = True
        row.updated_at = _utcnow()
        db.commit()
        db.refresh(row)
    return {"ok": True, **_out(row, first_value=fv)}


def entry_catalog() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "entries": sorted(ENTRY_CHOICES),
        "starter_paths": {k: dict(v) for k, v in STARTER_PATH_META.items()},
        "states": sorted(STATES),
        "first_value_contract": "pilot_first_value_v1",
        "demo_vs_real": {
            "demo_first_value_seen": "separate",
            "real_first_value_reached": "pilot_first_value_v1_only",
        },
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def soft_delete_for_candidate(db: Session, *, candidate_id: int) -> int:
    now = _utcnow()
    n = 0
    for row in (
        db.query(CandidateGuidedFirstValue)
        .filter(
            CandidateGuidedFirstValue.candidate_id == candidate_id,
            CandidateGuidedFirstValue.deleted_at.is_(None),
        )
        .all()
    ):
        row.state = "DELETED"
        row.deleted_at = now
        row.updated_at = now
        n += 1
    if n:
        db.commit()
    return n


def export_for_candidate(db: Session, *, candidate_id: int) -> dict[str, Any]:
    row = _row(db, candidate_id=candidate_id)
    if row is None:
        return {"guided_first_value": None}
    return {
        "guided_first_value": {
            "state": row.state,
            "entry_choice": row.entry_choice,
            "starter_path": row.starter_path,
            "demo_first_value_seen": bool(row.demo_first_value_seen),
            "real_first_value_reached": bool(row.real_first_value_reached),
            "progress_keys": sorted(_progress(row).keys()),
            "kpi_excluded": True,
        }
    }
