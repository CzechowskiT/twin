"""Approval Policy Engine — safe auto vs high-risk founder decisions."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import FounderDecision
from app.services.founder_command.constants import (
    DecisionRisk,
    DecisionStatus,
    HIGH_RISK_OPS,
    SAFE_AUTO_OPS,
)


def classify_operation(op: str, plan: dict[str, Any]) -> tuple[str, str]:
    """Return (risk, disposition) where disposition is auto|require_approval."""
    if op in HIGH_RISK_OPS:
        return DecisionRisk.CRITICAL.value, "require_approval"
    if op in SAFE_AUTO_OPS:
        return DecisionRisk.LOW.value, "auto"
    mode = plan.get("execution_mode")
    if mode == "analysis":
        return DecisionRisk.LOW.value, "auto"
    if mode == "build":
        return DecisionRisk.MEDIUM.value, "auto"
    if mode in {"deploy", "continuous"}:
        return DecisionRisk.HIGH.value, "require_approval"
    return DecisionRisk.MEDIUM.value, "require_approval"


def evaluate_plan_approvals(
    db: Session,
    *,
    command_id: str,
    plan: dict[str, Any],
    actor_fingerprint: str | None,
) -> dict[str, Any]:
    """Create decision records for high-risk needs; auto-approve safe path."""
    needs = list(plan.get("approval_needs") or [])
    mode = plan.get("execution_mode") or "analysis"
    primary_op = {
        "analysis": "diagnose",
        "build": "plan_batch",
        "deploy": "production_deploy",
        "continuous": "continuous_without_caps"
        if not (plan.get("limits") or {}).get("max_batches")
        else "continue_safe_batch",
    }.get(mode, "plan_batch")

    ops = [primary_op, *needs]
    decisions: list[FounderDecision] = []
    blocked = False
    for op in ops:
        risk, disposition = classify_operation(op, plan)
        if disposition == "auto":
            row = FounderDecision(
                id=str(uuid.uuid4()),
                command_id=command_id,
                operation=op,
                title=f"Auto-approved: {op}",
                risk=risk,
                status=DecisionStatus.AUTO_APPROVED.value,
                evidence_json=json.dumps(
                    {"plan_mode": mode, "limits": plan.get("limits")},
                    separators=(",", ":"),
                ),
                actor_fingerprint=actor_fingerprint,
                decided_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=24),
                created_at=datetime.utcnow(),
            )
            db.add(row)
            decisions.append(row)
            continue
        row = FounderDecision(
            id=str(uuid.uuid4()),
            command_id=command_id,
            operation=op,
            title=f"Founder approval required: {op}",
            risk=risk,
            status=DecisionStatus.PENDING.value,
            evidence_json=json.dumps(
                {
                    "plan_mode": mode,
                    "goal": plan.get("goal"),
                    "batch_objective": plan.get("batch_objective"),
                    "limits": plan.get("limits"),
                },
                separators=(",", ":"),
            ),
            actor_fingerprint=actor_fingerprint,
            expires_at=datetime.utcnow() + timedelta(hours=12),
            created_at=datetime.utcnow(),
        )
        db.add(row)
        decisions.append(row)
        blocked = True

    db.flush()
    return {
        "blocked": blocked,
        "decisions": [
            {
                "decision_id": d.id,
                "operation": d.operation,
                "risk": d.risk,
                "status": d.status,
                "title": d.title,
                "expires_at": d.expires_at.isoformat() + "Z" if d.expires_at else None,
            }
            for d in decisions
        ],
    }


def resolve_decision(
    db: Session,
    *,
    decision_id: str,
    approve: bool,
    actor_fingerprint: str,
    note: str | None = None,
) -> FounderDecision:
    row = db.get(FounderDecision, decision_id)
    if not row:
        raise LookupError("decision_not_found")
    if row.status != DecisionStatus.PENDING.value:
        raise ValueError("decision_not_pending")
    if row.expires_at and row.expires_at < datetime.utcnow():
        row.status = DecisionStatus.EXPIRED.value
        db.flush()
        raise ValueError("decision_expired")
    row.status = DecisionStatus.APPROVED.value if approve else DecisionStatus.REJECTED.value
    row.decided_at = datetime.utcnow()
    row.actor_fingerprint = actor_fingerprint
    if note:
        evidence = {}
        try:
            evidence = json.loads(row.evidence_json or "{}")
        except json.JSONDecodeError:
            evidence = {}
        evidence["founder_note"] = note[:500]
        row.evidence_json = json.dumps(evidence, separators=(",", ":"))
    db.flush()
    return row


def command_has_blocking_pending(db: Session, command_id: str) -> bool:
    from sqlalchemy import select

    row = db.execute(
        select(FounderDecision.id).where(
            FounderDecision.command_id == command_id,
            FounderDecision.status == DecisionStatus.PENDING.value,
        ).limit(1)
    ).scalar_one_or_none()
    return row is not None
