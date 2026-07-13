"""Recruiter workspace activation — onboarding steps through first decision event."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterActivationEvent, RecruiterWorkspaceActivation

ACTIVATION_STEPS: tuple[str, ...] = (
    "connect_workspace",
    "load_inbox_queue",
    "first_decision",
)

STEP_LABEL_KEYS: dict[str, str] = {
    "connect_workspace": "recruiterActivation.stepConnectWorkspace",
    "load_inbox_queue": "recruiterActivation.stepLoadInboxQueue",
    "first_decision": "recruiterActivation.stepFirstDecision",
}

NEXT_ACTION_BY_STEP: dict[str, tuple[str, str]] = {
    "connect_workspace": (
        "recruiterActivation.nextConnectWorkspace",
        "/recruiter/inbox",
    ),
    "load_inbox_queue": (
        "recruiterActivation.nextLoadInboxQueue",
        "/recruiter/inbox",
    ),
    "first_decision": (
        "recruiterActivation.nextFirstDecision",
        "/recruiter/inbox",
    ),
    "activation_complete": (
        "recruiterActivation.nextActivationComplete",
        "/recruiter/pipeline",
    ),
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_or_create_row(db: Session, company_slug: str) -> RecruiterWorkspaceActivation:
    row = (
        db.query(RecruiterWorkspaceActivation)
        .filter(RecruiterWorkspaceActivation.company_slug == company_slug)
        .first()
    )
    if row:
        return row
    row = RecruiterWorkspaceActivation(company_slug=company_slug)
    db.add(row)
    db.flush()
    return row


def _append_event(
    db: Session,
    *,
    company_slug: str,
    step: str,
    meta: dict[str, Any] | None = None,
) -> None:
    existing = (
        db.query(RecruiterActivationEvent)
        .filter(
            RecruiterActivationEvent.company_slug == company_slug,
            RecruiterActivationEvent.step == step,
        )
        .first()
    )
    if existing:
        return
    db.add(
        RecruiterActivationEvent(
            company_slug=company_slug,
            step=step,
            meta_json=json.dumps(meta or {}),
        )
    )


def _maybe_complete_activation(row: RecruiterWorkspaceActivation, now: datetime) -> None:
    if row.activation_completed_at is not None:
        return
    if row.workspace_connected_at and row.queue_loaded_at and row.first_decision_at:
        row.activation_completed_at = now


def record_workspace_connected(db: Session, *, company_slug: str) -> RecruiterWorkspaceActivation:
    """Idempotent — first successful recruiter token validation for slug."""
    now = _utcnow()
    row = _get_or_create_row(db, company_slug)
    if row.workspace_connected_at is None:
        row.workspace_connected_at = now
        _append_event(db, company_slug=company_slug, step="connect_workspace")
    row.updated_at = now
    _maybe_complete_activation(row, now)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def record_queue_loaded(db: Session, *, company_slug: str, queue_total: int = 0) -> RecruiterWorkspaceActivation:
    """Idempotent — first inbox queue load (empty queue counts as PASS per pilot tracker)."""
    now = _utcnow()
    row = _get_or_create_row(db, company_slug)
    if row.workspace_connected_at is None:
        row.workspace_connected_at = now
        _append_event(db, company_slug=company_slug, step="connect_workspace")
    if row.queue_loaded_at is None:
        row.queue_loaded_at = now
        _append_event(
            db,
            company_slug=company_slug,
            step="load_inbox_queue",
            meta={"queue_total": queue_total},
        )
    row.updated_at = now
    _maybe_complete_activation(row, now)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def record_first_decision(
    db: Session,
    *,
    company_slug: str,
    action: str,
    application_id: int | None = None,
) -> RecruiterWorkspaceActivation:
    """Activation event per LIMITED_RECRUITER_PILOT_TRACKER — first accept or decline."""
    now = _utcnow()
    row = _get_or_create_row(db, company_slug)
    if row.workspace_connected_at is None:
        row.workspace_connected_at = now
    if row.queue_loaded_at is None:
        row.queue_loaded_at = now
    act = action.strip().lower()
    if act not in {"accept", "decline"}:
        raise ValueError("action must be accept or decline")
    if row.first_decision_at is None:
        row.first_decision_at = now
        row.first_decision_action = act
        _append_event(
            db,
            company_slug=company_slug,
            step="first_decision",
            meta={"action": act, "application_id": application_id},
        )
        _append_event(
            db,
            company_slug=company_slug,
            step="activation_complete",
            meta={"activation_event": "first_decision", "action": act},
        )
    row.updated_at = now
    _maybe_complete_activation(row, now)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _step_completed(row: RecruiterWorkspaceActivation | None, step: str) -> bool:
    if not row:
        return False
    if step == "connect_workspace":
        return row.workspace_connected_at is not None
    if step == "load_inbox_queue":
        return row.queue_loaded_at is not None
    if step == "first_decision":
        return row.first_decision_at is not None
    return False


def serialize_activation(db: Session, *, company_slug: str) -> dict[str, Any]:
    row = (
        db.query(RecruiterWorkspaceActivation)
        .filter(RecruiterWorkspaceActivation.company_slug == company_slug)
        .first()
    )
    completed: list[str] = []
    remaining: list[str] = []
    for step in ACTIVATION_STEPS:
        if _step_completed(row, step):
            completed.append(step)
        else:
            remaining.append(step)

    configured = row is not None and bool(completed)
    activation_complete = bool(row and row.activation_completed_at)
    if activation_complete:
        next_key, next_href = NEXT_ACTION_BY_STEP["activation_complete"]
    elif remaining:
        next_key, next_href = NEXT_ACTION_BY_STEP[remaining[0]]
    else:
        next_key, next_href = NEXT_ACTION_BY_STEP["activation_complete"]

    total = len(ACTIVATION_STEPS)
    completion_percent = round(100.0 * len(completed) / total) if total else 0

    steps_out: list[dict[str, Any]] = []
    for step in ACTIVATION_STEPS:
        completed_at: datetime | None = None
        if row:
            if step == "connect_workspace":
                completed_at = row.workspace_connected_at
            elif step == "load_inbox_queue":
                completed_at = row.queue_loaded_at
            elif step == "first_decision":
                completed_at = row.first_decision_at
        steps_out.append(
            {
                "id": step,
                "label_key": STEP_LABEL_KEYS[step],
                "completed": step in completed,
                "completed_at": completed_at,
            }
        )

    return {
        "company_slug": company_slug,
        "configured": configured,
        "workspace_connected": "connect_workspace" in completed,
        "queue_loaded": "load_inbox_queue" in completed,
        "first_decision": "first_decision" in completed,
        "activation_complete": activation_complete,
        "first_decision_action": row.first_decision_action if row else None,
        "workspace_connected_at": row.workspace_connected_at if row else None,
        "queue_loaded_at": row.queue_loaded_at if row else None,
        "first_decision_at": row.first_decision_at if row else None,
        "activation_completed_at": row.activation_completed_at if row else None,
        "completion_percent": completion_percent,
        "completed_steps": completed,
        "remaining_steps": remaining,
        "next_action": next_key,
        "next_action_href": next_href,
        "steps": steps_out,
        "pilot_status": "PILOT",
        "browser_smoke_status": "NEEDS_FOUNDER_AUTH_SMOKE",
    }
