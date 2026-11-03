"""Append-only internal audit events — safe persistence foundation."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import AuditEvent

ALLOWED_EVENT_TYPES = frozenset(
    {
        "record_created",
        "record_updated",
        "status_changed",
        "note_appended",
        "task_created",
        "queue_item_opened",
        "queue_item_opened",
        "feedback_drafted",
        "review_opened",
        "foundation_demo",
    }
)
ALLOWED_ACTOR_PERSONAS = frozenset({"candidate", "recruiter", "company", "board", "system"})
ALLOWED_TARGET_TYPES = frozenset(
    {
        "work_item",
        "candidate_role",
        "review_queue_item",
        "review_queue_item",
        "company_feedback",
        "visibility_preference",
        "export_request",
        "request_intake_item",
        "placement_verification_event",
        "audit_event",
        "demo_target",
    }
)
ALLOWED_META_KEYS = frozenset({"scope", "field", "status_before", "status_after", "item_kind", "preview"})
_FORBIDDEN_META_KEYS = frozenset(
    {
        "email",
        "phone",
        "message",
        "body",
        "decline_note",
        "candidate_name",
        "cv",
        "ats",
        "outreach",
    }
)


def _sanitize_meta(meta: dict[str, Any] | None) -> dict[str, str]:
    if not meta:
        return {}
    clean: dict[str, str] = {}
    for key, value in meta.items():
        if key in _FORBIDDEN_META_KEYS or key not in ALLOWED_META_KEYS or value is None:
            continue
        text = str(value).strip()
        if text:
            clean[key] = text[:256]
    return clean


def _serialize(row: AuditEvent) -> dict[str, Any]:
    meta: dict[str, str] = {}
    if row.metadata_json:
        try:
            loaded = json.loads(row.metadata_json)
            if isinstance(loaded, dict):
                meta = _sanitize_meta(loaded)
        except json.JSONDecodeError:
            meta = {}
    return {
        "id": row.id,
        "event_type": row.event_type,
        "actor_persona": row.actor_persona,
        "actor_id": row.actor_id,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "metadata": meta,
        "source": row.source,
        "external_side_effect": bool(row.external_side_effect),
        "backend_write": True,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def create_audit_event(
    db: Session,
    *,
    event_type: str,
    actor_persona: str,
    actor_id: str,
    target_type: str,
    target_id: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    et = event_type.strip()
    persona = actor_persona.strip().lower()
    tt = target_type.strip()
    tid = target_id.strip()
    aid = actor_id.strip()
    if et not in ALLOWED_EVENT_TYPES:
        raise ValueError("Unsupported event_type.")
    if persona not in ALLOWED_ACTOR_PERSONAS:
        raise ValueError("Unsupported actor_persona.")
    if tt not in ALLOWED_TARGET_TYPES:
        raise ValueError("Unsupported target_type.")
    if not tid or not aid:
        raise ValueError("target_id and actor_id are required.")
    clean_meta = _sanitize_meta(metadata)
    row = AuditEvent(
        event_type=et,
        actor_persona=persona,
        actor_id=aid[:64],
        target_type=tt,
        target_id=tid[:128],
        metadata_json=json.dumps(clean_meta) if clean_meta else None,
        source="twin_internal",
        external_side_effect=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def list_audit_events(
    db: Session,
    *,
    actor_id: str,
    target_type: str | None = None,
    target_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(AuditEvent).filter(AuditEvent.actor_id == actor_id)
    if target_type:
        query = query.filter(AuditEvent.target_type == target_type.strip())
    if target_id:
        query = query.filter(AuditEvent.target_id == target_id.strip())
    rows = query.order_by(AuditEvent.created_at.desc()).limit(cap).all()
    return {"items": [_serialize(row) for row in rows], "count": len(rows)}
