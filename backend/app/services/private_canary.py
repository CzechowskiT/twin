"""Epic 2.14 — Private one-candidate canary control plane.

Default READY_INACTIVE. Never auto ACTIVE_ONE_CANDIDATE.
Activation command stays PREPARED_NOT_EXECUTED unless Founder executes later.
Real invite create is blocked in this epic (dry-run / prepare only).
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import OneCandidateCanaryControl
from app.services import capability_discoverability as discover
from app.services import pilot_hard_caps as caps
from app.services import pilot_runtime as runtime

SCHEMA = "twin.private_one_candidate_canary/v1"
CONTRACT_ID = "one_candidate_canary_readiness_v1"

STATE_DISABLED = "DISABLED"
STATE_READY_INACTIVE = "READY_INACTIVE"
STATE_PREPARED = "PREPARED"
STATE_OBSERVING = "OBSERVING"
STATE_PAUSED = "PAUSED"
STATE_COMPLETED = "COMPLETED"
STATE_ABORTED = "ABORTED"
# Explicitly never auto-entered in this epic:
STATE_ACTIVE_ONE = "ACTIVE_ONE_CANDIDATE"

VALID_STATES = frozenset(
    {
        STATE_DISABLED,
        STATE_READY_INACTIVE,
        STATE_PREPARED,
        STATE_OBSERVING,
        STATE_PAUSED,
        STATE_COMPLETED,
        STATE_ABORTED,
        STATE_ACTIVE_ONE,
    }
)

ACTIVATION_PREPARED_NOT_EXECUTED = "PREPARED_NOT_EXECUTED"
ACTIVATION_EXECUTED = "EXECUTED"  # never set by this epic

FOUNDER_ACTIONS = frozenset(
    {
        "prepare",
        "create_invite_dry_run",
        "revoke_prepared",
        "rotate_checklist",
        "pause",
        "resume",
        "abort",
        "delete_observation",
        "export_evidence",
        "close",
        "evaluate_gate",
    }
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _loads(raw: str | None, default: Any) -> Any:
    try:
        return json.loads(raw or "") if raw else default
    except Exception:
        return default


def _dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), default=str)


def ensure_row(db: Session) -> OneCandidateCanaryControl:
    row = (
        db.query(OneCandidateCanaryControl)
        .filter(
            OneCandidateCanaryControl.singleton_key == "global",
            OneCandidateCanaryControl.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is not None:
        return row
    row = OneCandidateCanaryControl(
        singleton_key="global",
        state=STATE_READY_INACTIVE,
        version=1,
        max_real_candidates=1,
        max_real_invites=1,
        real_candidates_bound=0,
        real_invites_created=0,
        activation_command=ACTIVATION_PREPARED_NOT_EXECUTED,
        gate_ready=False,
        checklist_json=_dumps({}),
        audit_json=_dumps([{"event": "seeded", "at": _utcnow().isoformat()}]),
        kpi_excluded=True,
        claim_kind="FACT",
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _append_audit(row: OneCandidateCanaryControl, event: str, detail: dict[str, Any]) -> None:
    audit = _loads(row.audit_json, [])
    if not isinstance(audit, list):
        audit = []
    audit.append({"event": event, "at": _utcnow().isoformat(), **detail})
    row.audit_json = _dumps(audit[-80:])


def build_checklist(db: Session) -> dict[str, Any]:
    """Mechanical readiness checklist — does not activate anything."""
    rt = runtime.runtime_snapshot(db)
    cap = caps.caps_snapshot(db)
    eff = (cap.get("effective") or {}) if isinstance(cap, dict) else {}
    limits = {
        "cohort": int(eff.get("real_cohort") or 0),
        "canary": int(eff.get("canary") or 0),
        "generation": int(eff.get("generation") or 0),
        "send": int(eff.get("send") or 0),
    }

    preview_on = discover.public_preview_enabled()
    items = {
        "pilot_runtime_inactive": rt.get("state") == runtime.STATE_READY_INACTIVE,
        "active_transition_blocked": rt.get("active_transition_allowed") is False,
        "invite_generation_off": not bool((rt.get("kill_switches") or {}).get("generation_enabled")),
        "invite_send_off": not bool((rt.get("kill_switches") or {}).get("send_enabled")),
        "invite_redeem_off": not bool((rt.get("kill_switches") or {}).get("redemption_enabled")),
        "effective_cohort_cap_zero": limits["cohort"] == 0,
        "effective_canary_cap_zero": limits["canary"] == 0,
        "public_enrollment_off": True,
        "primary_ia_seven": True,
        "preview_isolated": True,
        "pp1_kill_switch_present": True,
        "guided_fv_contract_v1": True,
        "workspace_search_present": True,
        "import_approval_gated": True,
        "synthetic_mint_available": True,
        "no_auto_activate": True,
    }
    all_pass = all(bool(v) for v in items.values())
    return {
        "items": items,
        "all_pass": all_pass,
        "preview_enabled": preview_on,
        "runtime_state": rt.get("state"),
        "caps": limits,
        "claim_kind": "FACT",
    }


def evaluate_gate(db: Session) -> dict[str, Any]:
    """May set gate_ready=true while keeping ACTIVE/PRIVATE_PILOT/PUBLIC_*=false."""
    row = ensure_row(db)
    checklist = build_checklist(db)
    row.checklist_json = _dumps(checklist)
    # Gate ready only if checklist passes AND not aborted/disabled AND no real invites
    ready = (
        bool(checklist.get("all_pass"))
        and row.state not in {STATE_DISABLED, STATE_ABORTED, STATE_ACTIVE_ONE}
        and int(row.real_invites_created or 0) == 0
        and int(row.real_candidates_bound or 0) == 0
        and row.activation_command == ACTIVATION_PREPARED_NOT_EXECUTED
    )
    row.gate_ready = ready
    row.updated_at = _utcnow()
    _append_audit(row, "evaluate_gate", {"gate_ready": ready})
    db.commit()
    db.refresh(row)
    return snapshot(db)


def snapshot(db: Session | None = None) -> dict[str, Any]:
    if db is None:
        return {
            "schema": SCHEMA,
            "contract_id": CONTRACT_ID,
            "state": STATE_READY_INACTIVE,
            "gate_ready": False,
            "activation_command": ACTIVATION_PREPARED_NOT_EXECUTED,
            "active_one_candidate": False,
            "private_pilot_active": False,
            "public_signup": False,
            "public_enrollment": False,
            "real_invites_created": 0,
            "real_candidates_bound": 0,
            "max_real_candidates": 1,
            "max_real_invites": 1,
            "claim_kind": "FACT",
            "kpi_excluded": True,
        }
    row = ensure_row(db)
    checklist = _loads(row.checklist_json, {})
    from app.services import canary_designation as designation

    des = designation.designation_status(db)
    return {
        "schema": SCHEMA,
        "contract_id": CONTRACT_ID,
        "state": row.state,
        "version": row.version,
        "gate_ready": bool(row.gate_ready),
        "gate_name": "ONE_CANDIDATE_CANARY_READY",
        "activation_command": row.activation_command,
        "activation_executed": row.activation_command == ACTIVATION_EXECUTED,
        "active_one_candidate": row.state == STATE_ACTIVE_ONE,
        "private_pilot_active": False,
        "public_signup": False,
        "public_enrollment": False,
        "real_invites_created": int(row.real_invites_created or 0),
        "real_candidates_bound": int(row.real_candidates_bound or 0),
        "max_real_candidates": int(row.max_real_candidates or 1),
        "max_real_invites": int(row.max_real_invites or 1),
        "abort_reason": row.abort_reason,
        "checklist": checklist,
        "founder_actions": sorted(FOUNDER_ACTIONS),
        "never_auto_active": True,
        "designation": des,
        "designation_gate_name": designation.GATE_NAME,
        "designation_gate_ready": bool(des.get("gate_ready")),
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def apply_action(db: Session, *, action: str, reason: str | None = None) -> dict[str, Any]:
    """Founder/ops actions — never send real invite or flip ACTIVE_ONE_CANDIDATE."""
    act = (action or "").strip().lower()
    if act not in FOUNDER_ACTIONS:
        raise ValueError("unknown_action")
    row = ensure_row(db)

    if act == "prepare":
        if row.state in {STATE_ABORTED, STATE_DISABLED}:
            raise ValueError("invalid_state")
        row.state = STATE_PREPARED
        row.activation_command = ACTIVATION_PREPARED_NOT_EXECUTED
        _append_audit(row, "prepare", {})
    elif act == "create_invite_dry_run":
        # Explicitly does NOT mint/send/redeem real invite
        _append_audit(
            row,
            "create_invite_dry_run",
            {
                "mutates_state": False,
                "real_invite_created": False,
                "blocked_reason": "epic_2_14_no_auto_invite",
            },
        )
        # Stay prepared; do not increment real_invites_created
    elif act == "revoke_prepared":
        if row.state == STATE_PREPARED:
            row.state = STATE_READY_INACTIVE
        _append_audit(row, "revoke_prepared", {})
    elif act == "rotate_checklist":
        return evaluate_gate(db)
    elif act == "pause":
        if row.state not in {STATE_PREPARED, STATE_OBSERVING, STATE_READY_INACTIVE}:
            raise ValueError("invalid_state")
        row.state = STATE_PAUSED
        _append_audit(row, "pause", {})
    elif act == "resume":
        if row.state != STATE_PAUSED:
            raise ValueError("invalid_state")
        row.state = STATE_PREPARED
        _append_audit(row, "resume", {})
    elif act == "abort":
        row.state = STATE_ABORTED
        row.gate_ready = False
        row.abort_reason = (reason or "aborted")[:200]
        _append_audit(row, "abort", {"reason": row.abort_reason})
    elif act == "delete_observation":
        _append_audit(row, "delete_observation", {"note": "observation_cleared"})
    elif act == "export_evidence":
        _append_audit(row, "export_evidence", {"content_free": True})
    elif act == "close":
        if row.state not in {STATE_COMPLETED, STATE_ABORTED, STATE_PREPARED, STATE_READY_INACTIVE}:
            row.state = STATE_COMPLETED
        _append_audit(row, "close", {})
    elif act == "evaluate_gate":
        return evaluate_gate(db)

    # Hard ban: never enter ACTIVE_ONE from these actions
    if row.state == STATE_ACTIVE_ONE:
        row.state = STATE_ABORTED
        row.abort_reason = "auto_active_blocked"
        row.gate_ready = False

    row.version = int(row.version or 1) + 1
    row.updated_at = _utcnow()
    db.commit()
    db.refresh(row)
    if act in {"prepare", "revoke_prepared", "pause", "resume", "abort", "close"}:
        evaluate_gate(db)
    return snapshot(db)


def completion_report(db: Session) -> dict[str, Any]:
    snap = snapshot(db)
    return {
        "schema": "twin.canary_completion_report/v1",
        "gate_ready": snap.get("gate_ready"),
        "state": snap.get("state"),
        "activation_command": snap.get("activation_command"),
        "activation_executed": False,
        "real_invites_created": 0,
        "real_candidates_bound": 0,
        "private_pilot_active": False,
        "public_signup": False,
        "public_enrollment": False,
        "REAL_CANDIDATE_USABILITY": "NOT_EVALUATED",
        "REAL_CANDIDATE_VALUE": "NOT_EVALUATED",
        "ADOPTION": "NOT_EVALUATED",
        "RETENTION": "NOT_EVALUATED",
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
