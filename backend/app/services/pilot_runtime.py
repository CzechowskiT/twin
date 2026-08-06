"""Epic 2.10 — fail-closed pilot runtime state + kill switches.

States: DISABLED | OPERATIONALLY_READY_INACTIVE | ACTIVE_INVITE_ONLY | PAUSED | INCIDENT_LOCKDOWN
Epic 2.10 finishes at OPERATIONALLY_READY_INACTIVE — no live transition to ACTIVE.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import PilotRuntimeState

SCHEMA = "twin.pilot_runtime/v1"

STATE_DISABLED = "DISABLED"
STATE_READY_INACTIVE = "OPERATIONALLY_READY_INACTIVE"
STATE_ACTIVE = "ACTIVE_INVITE_ONLY"
STATE_PAUSED = "PAUSED"
STATE_LOCKDOWN = "INCIDENT_LOCKDOWN"

VALID_STATES = frozenset(
    {STATE_DISABLED, STATE_READY_INACTIVE, STATE_ACTIVE, STATE_PAUSED, STATE_LOCKDOWN}
)

# Epic 2.10: ACTIVE transitions blocked (Founder canary is a later gate).
ACTIVE_TRANSITION_ALLOWED = False


def _utcnow() -> datetime:
    return datetime.utcnow()


def ensure_runtime_row(db: Session) -> PilotRuntimeState:
    row = (
        db.query(PilotRuntimeState)
        .filter(PilotRuntimeState.singleton_key == "global", PilotRuntimeState.deleted_at.is_(None))
        .one_or_none()
    )
    if row is not None:
        return row
    row = PilotRuntimeState(
        singleton_key="global",
        state=STATE_READY_INACTIVE,
        access_enabled=False,
        generation_enabled=False,
        send_enabled=False,
        redemption_enabled=False,
        telemetry_enabled=True,
        support_enabled=True,
        updated_at=_utcnow(),
        created_at=_utcnow(),
        kpi_excluded=True,
        claim_kind="FACT",
        audit_json=json.dumps({"seeded": "epic_2_10"}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def runtime_snapshot(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return _default_snapshot()
    try:
        row = ensure_runtime_row(db)
    except Exception:
        return _default_snapshot()
    return {
        "schema": SCHEMA,
        "state": row.state,
        "pilot_access_status": row.state,
        "kill_switches": {
            "access_enabled": bool(row.access_enabled),
            "generation_enabled": bool(row.generation_enabled),
            "send_enabled": bool(row.send_enabled),
            "redemption_enabled": bool(row.redemption_enabled),
            "telemetry_enabled": bool(row.telemetry_enabled),
            "support_enabled": bool(row.support_enabled),
        },
        "active_transition_allowed": ACTIVE_TRANSITION_ALLOWED,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def _default_snapshot() -> dict[str, Any]:
    return {
        "schema": SCHEMA,
        "state": STATE_READY_INACTIVE,
        "pilot_access_status": STATE_READY_INACTIVE,
        "kill_switches": {
            "access_enabled": False,
            "generation_enabled": False,
            "send_enabled": False,
            "redemption_enabled": False,
            "telemetry_enabled": True,
            "support_enabled": True,
        },
        "active_transition_allowed": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def assert_generation_allowed(db: Session) -> tuple[bool, str]:
    snap = runtime_snapshot(db)
    if snap["state"] in (STATE_DISABLED, STATE_LOCKDOWN, STATE_PAUSED):
        return False, f"runtime_{snap['state'].lower()}"
    if snap["state"] != STATE_ACTIVE:
        return False, "runtime_not_active_invite_only"
    if not snap["kill_switches"]["generation_enabled"]:
        return False, "kill_switch_generation_off"
    if not snap["kill_switches"]["access_enabled"]:
        return False, "kill_switch_access_off"
    return True, "ok"


def assert_send_allowed(db: Session) -> tuple[bool, str]:
    ok, reason = assert_generation_allowed(db)
    if not ok and reason not in ("kill_switch_generation_off",):
        # send still needs ACTIVE + access; generation may be separate
        snap = runtime_snapshot(db)
        if snap["state"] != STATE_ACTIVE:
            return False, "runtime_not_active_invite_only"
        if not snap["kill_switches"]["access_enabled"]:
            return False, "kill_switch_access_off"
    snap = runtime_snapshot(db)
    if not snap["kill_switches"]["send_enabled"]:
        return False, "kill_switch_send_off"
    return True, "ok"


def assert_redeem_allowed(db: Session) -> tuple[bool, str]:
    snap = runtime_snapshot(db)
    if snap["state"] in (STATE_DISABLED, STATE_LOCKDOWN):
        return False, f"runtime_{snap['state'].lower()}"
    if snap["state"] != STATE_ACTIVE:
        return False, "runtime_not_active_invite_only"
    if not snap["kill_switches"]["redemption_enabled"]:
        return False, "kill_switch_redemption_off"
    return True, "ok"


def dry_run_transition(
    db: Session,
    *,
    target_state: str,
    decision: str,
) -> dict[str, Any]:
    """ACTIVATE/CONTINUE/PAUSE/STOP gates — always mutates_state=false."""
    target = (target_state or "").strip().upper()
    decision_u = (decision or "").strip().upper()
    current = runtime_snapshot(db)
    blockers: list[str] = []
    if target not in VALID_STATES:
        blockers.append("invalid_target_state")
    if decision_u == "ACTIVATE" and target == STATE_ACTIVE:
        if not ACTIVE_TRANSITION_ALLOWED:
            blockers.append("active_transition_blocked_in_epic_2_10")
        blockers.append("founder_manifest_required")
        blockers.append("send_authorization_required")
    if decision_u not in ("ACTIVATE", "CONTINUE", "PAUSE", "STOP"):
        blockers.append("invalid_decision")
    return {
        "schema": "twin.pilot_decision_gate/v1",
        "decision": decision_u,
        "current_state": current["state"],
        "target_state": target,
        "allowed": len(blockers) == 0 and decision_u in ("CONTINUE", "PAUSE", "STOP"),
        "blockers": blockers,
        "mutates_state": False,
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
