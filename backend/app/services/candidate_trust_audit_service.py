"""Append-only candidate trust audit events."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateTrustAuditEvent

ALLOWED_EVENT_TYPES = frozenset(
    {
        "account_deleted",
        "consent_granted",
        "consent_withdrawn",
        "privacy_request_created",
        "privacy_request_cancelled",
        "profile_updated",
        "export_requested",
        "trust_center_viewed",
    }
)


def _parse_json(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _dump_json(data: dict[str, Any] | None) -> str | None:
    if not data:
        return None
    return json.dumps(data)


def record_trust_audit_event(
    db: Session,
    *,
    candidate_id: int,
    event_type: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
    actor: str = "candidate",
    actor_user_id: int | None = None,
) -> CandidateTrustAuditEvent:
    if event_type not in ALLOWED_EVENT_TYPES:
        raise ValueError(f"Unknown event type: {event_type}")
    row = CandidateTrustAuditEvent(
        candidate_id=candidate_id,
        event_type=event_type,
        summary=summary[:500],
        metadata_json=_dump_json(metadata),
        actor=actor,
        actor_user_id=actor_user_id,
    )
    db.add(row)
    db.flush()
    return row


def list_trust_audit_events(
    db: Session,
    *,
    candidate_id: int,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    q = (
        db.query(CandidateTrustAuditEvent)
        .filter(CandidateTrustAuditEvent.candidate_id == candidate_id)
        .order_by(CandidateTrustAuditEvent.created_at.desc())
    )
    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    items = [
        {
            "id": row.id,
            "event_type": row.event_type,
            "summary": row.summary,
            "metadata": _parse_json(row.metadata_json),
            "actor": row.actor,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return {"items": items, "total": total}


def build_trust_timeline(
    db: Session,
    *,
    candidate_id: int,
    limit: int = 20,
) -> list[dict[str, Any]]:
    events = list_trust_audit_events(db, candidate_id=candidate_id, limit=limit, offset=0)
    return [
        {
            "id": f"audit-{item['id']}",
            "type": item["event_type"],
            "at": item["created_at"],
            "summary": item["summary"],
        }
        for item in events["items"]
    ]
