"""Work items — notes and tasks with audit trail on writes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import WorkItem
from app.services.audit_events import create_audit_event
from app.utils.slug import slugify_company

ALLOWED_ITEM_TYPES = frozenset({"note", "task", "follow_up", "feedback_request"})
ALLOWED_STATUSES = frozenset({"open", "in_progress", "done", "blocked"})
ALLOWED_PERSONA_SCOPES = frozenset({"recruiter", "company"})
PATCHABLE_FIELDS = frozenset({"status", "title", "description", "due_date", "owner_label"})


def _serialize(row: WorkItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "item_type": row.item_type,
        "title": row.title,
        "description": row.description,
        "status": row.status,
        "due_date": row.due_date,
        "owner_label": row.owner_label,
        "persona_scope": row.persona_scope,
        "company_slug": row.company_slug,
        "created_by_user_id": row.created_by_user_id,
        "backend_write": True,
        "external_side_effect": False,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _audit_write(
    db: Session,
    *,
    event_type: str,
    actor_persona: str,
    actor_id: str,
    work_item_id: int,
    metadata: dict[str, Any] | None = None,
) -> None:
    create_audit_event(
        db,
        event_type=event_type,
        actor_persona=actor_persona,
        actor_id=actor_id,
        target_type="work_item",
        target_id=str(work_item_id),
        metadata=metadata,
    )


def create_work_item(
    db: Session,
    *,
    item_type: str,
    title: str,
    description: str | None,
    persona_scope: str,
    user_id: int,
    company_slug: str | None = None,
    status: str = "open",
    due_date: str | None = None,
    owner_label: str | None = None,
) -> dict[str, Any]:
    it = item_type.strip().lower()
    scope = persona_scope.strip().lower()
    st = status.strip().lower()
    if it not in ALLOWED_ITEM_TYPES:
        raise ValueError("Unsupported item_type.")
    if scope not in ALLOWED_PERSONA_SCOPES:
        raise ValueError("Unsupported persona_scope.")
    if st not in ALLOWED_STATUSES:
        raise ValueError("Unsupported status.")
    title_clean = title.strip()
    if not title_clean:
        raise ValueError("title is required.")
    slug = slugify_company(company_slug.strip()) if company_slug else None
    row = WorkItem(
        item_type=it,
        title=title_clean[:200],
        description=(description or "").strip() or None,
        status=st,
        due_date=(due_date or "").strip() or None,
        owner_label=(owner_label or "").strip()[:120] or None,
        persona_scope=scope,
        company_slug=slug,
        created_by_user_id=user_id,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit_write(
        db,
        event_type="task_created" if it == "task" else "note_appended",
        actor_persona=scope,
        actor_id=str(user_id),
        work_item_id=row.id,
        metadata={"item_kind": it, "scope": scope},
    )
    return _serialize(row)


def list_work_items(
    db: Session,
    *,
    user_id: int,
    persona_scope: str | None = None,
    company_slug: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    cap = max(1, min(limit, 100))
    query = db.query(WorkItem).filter(WorkItem.created_by_user_id == user_id)
    if persona_scope:
        query = query.filter(WorkItem.persona_scope == persona_scope.strip().lower())
    if company_slug:
        query = query.filter(WorkItem.company_slug == slugify_company(company_slug.strip()))
    rows = query.order_by(WorkItem.updated_at.desc()).limit(cap).all()
    return {"items": [_serialize(row) for row in rows], "count": len(rows)}


def patch_work_item(
    db: Session,
    *,
    work_item_id: int,
    user_id: int,
    fields: dict[str, Any],
) -> dict[str, Any]:
    row = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
    if not row:
        raise ValueError("Work item not found.")
    if row.created_by_user_id != user_id:
        raise ValueError("Not authorized for this work item.")
    before = row.status
    for key, value in fields.items():
        if key not in PATCHABLE_FIELDS:
            continue
        if key == "status":
            st = str(value).strip().lower()
            if st not in ALLOWED_STATUSES:
                raise ValueError("Unsupported status.")
            row.status = st
        elif key == "title":
            text = str(value).strip()
            if not text:
                raise ValueError("title cannot be empty.")
            row.title = text[:200]
        elif key == "description":
            row.description = str(value).strip() or None
        elif key == "due_date":
            row.due_date = str(value).strip()[:10] or None
        elif key == "owner_label":
            row.owner_label = str(value).strip()[:120] or None
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    _audit_write(
        db,
        event_type="record_updated",
        actor_persona=row.persona_scope,
        actor_id=str(user_id),
        work_item_id=row.id,
        metadata={"status_before": before, "status_after": row.status, "field": "patch"},
    )
    return _serialize(row)
