"""Epic 2.10 — aggregate pilot operations + incident synthetic exercise."""

from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.services import activation_manifest_validator as amv
from app.services import pilot_hard_caps as caps
from app.services import pilot_metric_contracts as metrics
from app.services import pilot_runtime as runtime
from app.services import pilot_support_ops as support
from app.database.models import PilotIncidentExercise

SCHEMA = "twin.pilot_operations/v1"


def build_ops_aggregate(db: Session, *, user_id: int | None = None, candidate_id: int | None = None) -> dict[str, Any]:
    rt = runtime.runtime_snapshot(db)
    cap = caps.caps_snapshot(db)
    reg = metrics.registry_payload(db)
    fv = (
        metrics.derive_first_value(db, user_id=user_id, candidate_id=candidate_id)
        if user_id
        else {"reached": False, "kpi_excluded": True}
    )
    return {
        "schema": SCHEMA,
        "runtime": rt,
        "hard_caps": cap,
        "metrics": reg,
        "first_value": fv,
        "help": support.help_center_content(),
        "recovery": {
            "home": support.recovery_guidance(journey="home"),
            "onboarding": support.recovery_guidance(journey="onboarding"),
            "privacy": support.recovery_guidance(journey="privacy"),
            "invite": support.recovery_guidance(journey="invite"),
            "daily_os": support.recovery_guidance(journey="daily_os"),
        },
        "safety": {
            "public_launch": "NO-GO",
            "public_signup": "OFF",
            "public_enrollment": "OFF",
            "pilot_access": rt["state"],
            "real_invite_generation": "OFF",
            "real_invite_send": "OFF",
            "real_invite_redemption": "OFF",
            "active_real_invites": 0,
            "real_pilot_users_added": 0,
            "phase_3b": "BLOCKED",
            "phase_3_agent": "NOT_STARTED",
            "ms_calendar_write": "OFF",
            "application_submission": "OFF",
            "employer_contact": "OFF",
            "external_purchase_or_enrollment": "OFF",
        },
        "kpi_excluded": True,
        "claim_kind": "FACT",
    }


def ops_quality_view(db: Session) -> dict[str, Any]:
    """Operator aggregate — counts only, no PII/content."""
    return {
        "schema": "twin.pilot_ops_quality/v1",
        "runtime": runtime.runtime_snapshot(db),
        "caps": caps.caps_snapshot(db),
        "counts": metrics.aggregate_counts(db),
        "contracts_ready": True,
        "pii_default": False,
        "content_default": False,
        "kpi_excluded": True,
        "claim_kind": "FACT",
    }


def dry_run_decision(db: Session, *, decision: str, target_state: str | None = None) -> dict[str, Any]:
    target = target_state or {
        "ACTIVATE": runtime.STATE_ACTIVE,
        "CONTINUE": runtime.STATE_READY_INACTIVE,
        "PAUSE": runtime.STATE_PAUSED,
        "STOP": runtime.STATE_DISABLED,
    }.get((decision or "").upper(), runtime.STATE_READY_INACTIVE)
    return runtime.dry_run_transition(db, target_state=target, decision=decision)


def validate_manifest_dry_run(payload: dict[str, Any] | None) -> dict[str, Any]:
    return amv.validate_activation_manifest_dry_run(payload)


def run_synthetic_incident_exercise(db: Session) -> dict[str, Any]:
    """Synthetic incident/rollback readiness — never activates real pilot."""
    key = f"synth_incident_{secrets.token_hex(6)}"
    detail = {
        "steps": [
            "detect_anomaly",
            "flip_kill_switch_send_off",
            "flip_kill_switch_generation_off",
            "enter_incident_lockdown_dry_run",
            "rollback_owner_checklist",
        ],
        "live_activation": False,
        "real_invites_revoked": 0,
    }
    gate = dry_run_decision(db, decision="STOP", target_state=runtime.STATE_LOCKDOWN)
    row = PilotIncidentExercise(
        exercise_key=key,
        kind="synthetic_rollback",
        result="PASS" if gate.get("mutates_state") is False else "FAIL",
        detail_json=json.dumps(detail),
        mutates_state=False,
        created_at=datetime.utcnow(),
        kpi_excluded=True,
        claim_kind="FACT",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "exercise_key": key,
        "result": row.result,
        "mutates_state": False,
        "gate": gate,
        "detail": detail,
        "kpi_excluded": True,
    }
