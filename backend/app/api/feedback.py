"""Authenticated product feedback API + ops admin queue."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user, get_db
from app.database.models import ProductFeedback, User
from app.schemas.feedback import ProductFeedbackIn, ProductFeedbackOut
from app.services.product_funnel import emit_funnel_event

router = APIRouter()


def _require_ops_admin(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


ALLOWED_TYPES = frozenset({"bug", "suggestion", "nps", "contact", "ux", "other"})
ALLOWED_STATUS = frozenset({"open", "triaged", "in_progress", "resolved", "wontfix"})
ALLOWED_PRIORITY = frozenset({"low", "normal", "high", "critical"})


class ProductFeedbackCreate(ProductFeedbackIn):
    feedback_type: str = Field(default="suggestion", max_length=32)
    workflow_key: str | None = Field(default=None, max_length=64)
    tags: list[str] = Field(default_factory=list)


class FeedbackAdminOut(BaseModel):
    id: int
    category: str
    rating: int
    message: str | None
    page_path: str | None
    feedback_type: str
    workflow_key: str | None
    tags: list[str]
    priority: str
    status: str
    assigned_to_label: str | None
    created_at: str
    resolved_at: str | None


class FeedbackPatchBody(BaseModel):
    status: str | None = Field(default=None, max_length=32)
    priority: str | None = Field(default=None, max_length=16)
    assigned_to_label: str | None = Field(default=None, max_length=120)
    tags: list[str] | None = None


def _row_out(row: ProductFeedback) -> FeedbackAdminOut:
    tags: list[str] = []
    try:
        raw = json.loads(row.tags_json or "[]")
        if isinstance(raw, list):
            tags = [str(x)[:40] for x in raw][:12]
    except json.JSONDecodeError:
        tags = []
    return FeedbackAdminOut(
        id=row.id,
        category=row.category,
        rating=row.rating,
        message=row.message,
        page_path=row.page_path,
        feedback_type=getattr(row, "feedback_type", None) or "suggestion",
        workflow_key=getattr(row, "workflow_key", None),
        tags=tags,
        priority=getattr(row, "priority", None) or "normal",
        status=getattr(row, "status", None) or "open",
        assigned_to_label=getattr(row, "assigned_to_label", None),
        created_at=row.created_at.isoformat() + "Z" if row.created_at else "",
        resolved_at=row.resolved_at.isoformat() + "Z" if row.resolved_at else None,
    )


@router.post("", response_model=ProductFeedbackOut, status_code=201)
def submit_feedback(
    body: ProductFeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductFeedbackOut:
    ftype = (body.feedback_type or "suggestion").strip().lower()
    if ftype not in ALLOWED_TYPES:
        ftype = "suggestion"
    tags = [t.strip().lower()[:40] for t in (body.tags or []) if t.strip()][:12]
    row = ProductFeedback(
        user_id=user.id,
        category=body.category.strip().lower(),
        rating=body.rating,
        message=(body.message or "").strip() or None,
        page_path=(body.page_path or "").strip() or None,
        feedback_type=ftype,
        workflow_key=(body.workflow_key or "").strip()[:64] or None,
        tags_json=json.dumps(tags) if tags else None,
        priority="normal",
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    try:
        emit_funnel_event(
            db,
            event_name="feedback_submitted",
            user_id=user.id,
            persona=getattr(user, "role", None) or "candidate",
            properties={"feedback_type": ftype, "category": row.category},
        )
        db.commit()
    except Exception:
        pass
    return ProductFeedbackOut.model_validate(row)


@router.get("/admin/queue")
def admin_feedback_queue(
    status_filter: str | None = Query(default="open", alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    """Ops Bearer feedback queue — no user email/PII in response."""
    _require_ops_admin(settings, authorization)
    q = db.query(ProductFeedback).order_by(ProductFeedback.id.desc())
    if status_filter:
        q = q.filter(ProductFeedback.status == status_filter)
    rows = q.limit(limit).all()
    return {"items": [_row_out(r).model_dump() for r in rows], "count": len(rows)}


@router.patch("/admin/{feedback_id}")
def admin_patch_feedback(
    feedback_id: int,
    body: FeedbackPatchBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> dict:
    _require_ops_admin(settings, authorization)
    row = db.query(ProductFeedback).filter(ProductFeedback.id == feedback_id).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not_found")
    if body.status:
        st = body.status.strip().lower()
        if st not in ALLOWED_STATUS:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_status")
        row.status = st
        if st == "resolved":
            from datetime import datetime, timezone

            row.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if body.priority:
        pr = body.priority.strip().lower()
        if pr not in ALLOWED_PRIORITY:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="invalid_priority")
        row.priority = pr
    if body.assigned_to_label is not None:
        row.assigned_to_label = (body.assigned_to_label or "").strip()[:120] or None
    if body.tags is not None:
        tags = [t.strip().lower()[:40] for t in body.tags if t.strip()][:12]
        row.tags_json = json.dumps(tags)
    db.commit()
    db.refresh(row)
    return {"item": _row_out(row).model_dump()}
