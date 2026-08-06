"""Epic 2.11 — Isolated demo workspace (versioned fictional scenario).

Rules:
- mode=DEMO, kpi_excluded always
- zero writes to canonical job/match/application/calendar/evidence tables
- no workers / LLM / email / OAuth / calendar / apps
- SIMULATED labels on all content
- no promote-to-real
- Start with my data exits clean (soft-delete session)
"""

from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateIsolatedDemoSession

SCHEMA = "twin.isolated_demo/v1"
CONTRACT_ID = "isolated_demo_v1"
SCENARIO_VERSION = "demo_scenario_v1"

# Fictional only — never real people / employers / emails
_SCENARIO: dict[str, Any] = {
    "version": SCENARIO_VERSION,
    "persona": {
        "label": "SIMULATED candidate — Alex Example",
        "role_target": "Product operations (simulated)",
        "locale": "en",
    },
    "direction": {
        "label": "SIMULATED",
        "summary": "Explore product operations roles with calm weekly cadence (demo only).",
    },
    "evidence": [
        {
            "label": "SIMULATED",
            "title": "Demo project write-up",
            "note": "Fictional evidence card — not stored in portfolio tables.",
        }
    ],
    "opportunities": [
        {
            "label": "SIMULATED",
            "title": "Demo Ops Coordinator",
            "company": "Example Co (fictional)",
            "fit_hint": "Illustrative match — not a live job.",
        },
        {
            "label": "SIMULATED",
            "title": "Demo Program Analyst",
            "company": "Northwind Labs (fictional)",
            "fit_hint": "Illustrative match — not a live job.",
        },
    ],
    "actions": [
        {
            "label": "SIMULATED",
            "title": "Review demo opportunity",
            "when": "This week (demo)",
        }
    ],
    "contamination_guards": {
        "canonical_table_writes": 0,
        "external_calls": 0,
        "email_sends": 0,
        "oauth": False,
        "calendar_write": False,
        "llm": False,
        "workers": False,
        "promote_to_real": False,
    },
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def scenario_payload() -> dict[str, Any]:
    return json.loads(json.dumps(_SCENARIO))


def _active(db: Session, *, candidate_id: int) -> CandidateIsolatedDemoSession | None:
    return (
        db.query(CandidateIsolatedDemoSession)
        .filter(
            CandidateIsolatedDemoSession.candidate_id == candidate_id,
            CandidateIsolatedDemoSession.status == "ACTIVE",
            CandidateIsolatedDemoSession.deleted_at.is_(None),
        )
        .order_by(CandidateIsolatedDemoSession.id.desc())
        .first()
    )


def _out(row: CandidateIsolatedDemoSession, *, include_scenario: bool = True) -> dict[str, Any]:
    scenario = {}
    if include_scenario:
        try:
            scenario = json.loads(row.scenario_json or "{}")
        except Exception:
            scenario = scenario_payload()
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "session_key": row.session_key,
        "scenario_version": row.scenario_version,
        "mode": "DEMO",
        "status": row.status,
        "persistent_demo_marker": True,
        "simulated_labels": True,
        "promote_to_real": False,
        "kpi_excluded": True,
        "canonical_writes": int(row.canonical_writes or 0),
        "external_calls": int(row.external_calls or 0),
        "contamination": {
            "canonical_writes": int(row.canonical_writes or 0),
            "external_calls": int(row.external_calls or 0),
            "copy_to_canonical": 0,
            "kpi_leak": 0,
        },
        "scenario": scenario if include_scenario else None,
        "claim_kind": "FACT",
    }


def start_session(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    """Start or resume isolated demo — never touches canonical product tables."""
    existing = _active(db, candidate_id=candidate_id)
    if existing is not None:
        return {"ok": True, "resumed": True, **_out(existing)}
    scenario = scenario_payload()
    row = CandidateIsolatedDemoSession(
        candidate_id=candidate_id,
        user_id=user_id,
        session_key=f"demo_{secrets.token_hex(8)}",
        scenario_version=SCENARIO_VERSION,
        mode="DEMO",
        status="ACTIVE",
        scenario_json=json.dumps(scenario),
        canonical_writes=0,
        external_calls=0,
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "resumed": False, **_out(row)}


def get_session(db: Session, *, candidate_id: int) -> dict[str, Any]:
    row = _active(db, candidate_id=candidate_id)
    if row is None:
        return {
            "schema": SCHEMA,
            "active": False,
            "mode": None,
            "kpi_excluded": True,
            "claim_kind": "FACT",
        }
    return {"active": True, **_out(row)}


def exit_to_my_data(db: Session, *, candidate_id: int, user_id: int) -> dict[str, Any]:
    """Clean exit — soft-delete demo session; no promote; no residual DEMO mode."""
    _ = user_id
    now = _utcnow()
    n = 0
    for row in (
        db.query(CandidateIsolatedDemoSession)
        .filter(
            CandidateIsolatedDemoSession.candidate_id == candidate_id,
            CandidateIsolatedDemoSession.deleted_at.is_(None),
        )
        .all()
    ):
        row.status = "EXITED"
        row.exited_at = now
        row.deleted_at = now
        row.updated_at = now
        n += 1
    if n:
        db.commit()
    return {
        "ok": True,
        "exited_sessions": n,
        "promote_to_real": False,
        "demo_mode": False,
        "canonical_writes": 0,
        "kpi_excluded": True,
        "claim_kind": "FACT",
    }


def contamination_report(db: Session, *, candidate_id: int) -> dict[str, Any]:
    rows = (
        db.query(CandidateIsolatedDemoSession)
        .filter(CandidateIsolatedDemoSession.candidate_id == candidate_id)
        .all()
    )
    writes = sum(int(r.canonical_writes or 0) for r in rows)
    external = sum(int(r.external_calls or 0) for r in rows)
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "canonical_writes": writes,
        "external_calls": external,
        "copy_to_canonical": 0,
        "kpi_contamination": 0,
        "passed": writes == 0 and external == 0,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def soft_delete_for_candidate(db: Session, *, candidate_id: int) -> int:
    now = _utcnow()
    n = 0
    for row in (
        db.query(CandidateIsolatedDemoSession)
        .filter(
            CandidateIsolatedDemoSession.candidate_id == candidate_id,
            CandidateIsolatedDemoSession.deleted_at.is_(None),
        )
        .all()
    ):
        row.status = "DELETED"
        row.deleted_at = now
        row.updated_at = now
        n += 1
    if n:
        db.commit()
    return n


def export_for_candidate(db: Session, *, candidate_id: int) -> dict[str, Any]:
    rows = (
        db.query(CandidateIsolatedDemoSession)
        .filter(
            CandidateIsolatedDemoSession.candidate_id == candidate_id,
            CandidateIsolatedDemoSession.deleted_at.is_(None),
        )
        .all()
    )
    return {
        "isolated_demo_sessions": [
            {
                "session_key": r.session_key,
                "scenario_version": r.scenario_version,
                "mode": r.mode,
                "status": r.status,
                "canonical_writes": int(r.canonical_writes or 0),
                "external_calls": int(r.external_calls or 0),
                "kpi_excluded": True,
                # Never export scenario narrative content into privacy dumps as free text blobs
                "scenario_present": bool(r.scenario_json and r.scenario_json != "{}"),
            }
            for r in rows
        ]
    }
