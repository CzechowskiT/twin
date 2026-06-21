"""Append-only placement verification events — safe persistence foundation."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import PlacementEvent
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

ALLOWED_EVENT_TYPES = frozenset(
    {
        "placement_declared",
        "evidence_collected",
        "internal_review_opened",
        "verification_ready",
        "board_evidence_reviewed",
        "verification_blocked",
        "demo_verification_recorded",
    }
)
ALLOWED_EVENT_STATUSES = frozenset(
    {
        "draft",
        "internal_only",
        "evidence_pending",
        "ready_for_review",
        "reviewed",
        "blocked",
    }
)
ALLOWED_ACTOR_PERSONAS = frozenset({"candidate", "recruiter", "company", "board", "system"})
ALLOWED_SOURCES = frozenset({"twin_internal", "twin_internal_prod_smoke"})
ALLOWED_META_KEYS = frozenset({"scope", "field", "status_before", "status_after", "item_kind", "preview"})
_FORBIDDEN_META_KEYS = frozenset(
    {
        "email",
        "phone",
        "message",
        "body",
        "invoice",
        "payment",
        "revenue",
        "employer_confirmed",
        "legal",
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


def _serialize(row: PlacementEvent) -> dict[str, Any]:
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
        "placement_id": row.placement_id,
        "candidate_id": row.candidate_id,
        "role_context_id": row.role_context_id,
        "company_slug": row.company_slug,
        "application_id": row.application_id,
        "event_type": row.event_type,
        "event_status": row.event_status,
        "actor_persona": row.actor_persona,
        "metadata": meta,
        "source": row.source or "twin_internal",
        "external_side_effect": bool(row.external_side_effect),
        "backend_write": True,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def create_placement_event(
    db: Session,
    *,
    event_type: str,
    event_status: str,
    actor_persona: str,
    user_id: int,
    placement_id: str,
    candidate_id: str | None = None,
    role_context_id: str | None = None,
    company_slug: str | None = None,
    application_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    source: str = "twin_internal",
) -> dict[str, Any]:
    et = event_type.strip()
    es = event_status.strip().lower()
    persona = actor_persona.strip().lower()
    pid = placement_id.strip()
    src = source.strip()
    if et not in ALLOWED_EVENT_TYPES:
        raise ValueError("Unsupported event_type.")
    if es not in ALLOWED_EVENT_STATUSES:
        raise ValueError("Unsupported event_status.")
    if persona not in ALLOWED_ACTOR_PERSONAS:
        raise ValueError("Unsupported actor_persona.")
    if src not in ALLOWED_SOURCES:
        raise ValueError("Unsupported source.")
    if not pid:
        raise ValueError("placement_id is required.")
    clean_meta = _sanitize_meta(metadata)
    row = PlacementEvent(
        placement_id=pid[:128],
        candidate_id=(candidate_id or "").strip()[:64] or None,
        role_context_id=(role_context_id or "").strip()[:64] or None,
        company_slug=slugify_company(company_slug.strip()) if company_slug else None,
        application_id=application_id,
        event_type=et,
        event_status=es,
        actor_persona=persona,
        actor=persona,
        metadata_json=json.dumps(clean_meta) if clean_meta else None,
        source=src,
        external_side_effect=False,
        created_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    create_audit_event(
        db,
        event_type="record_created",
        actor_persona=persona,
        actor_id=str(user_id),
        target_type="placement_verification_event",
        target_id=str(row.id),
        metadata={"scope": "placement_events", "item_kind": et},
    )
    return _serialize(row)


def list_placement_events(
    db: Session,
    *,
    placement_id: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(PlacementEvent).filter(PlacementEvent.placement_id.isnot(None))
    if placement_id:
        query = query.filter(PlacementEvent.placement_id == placement_id.strip())
    rows = query.order_by(PlacementEvent.created_at.desc()).limit(cap).all()
    return {"items": [_serialize(row) for row in rows], "count": len(rows)}
