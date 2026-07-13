"""Recruiter saved filter views — inbox, talent pool, trust review."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterSavedView
from app.utils.slug import slugify_company

ALLOWED_SURFACES = frozenset({"inbox", "talent_pool", "trust_review"})


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_slug(company_slug: str) -> str:
    slug = slugify_company(company_slug.strip())
    if not slug or slug == "company":
        raise ValueError("company_slug is required.")
    return slug


def _serialize(row: RecruiterSavedView) -> dict[str, Any]:
    try:
        filt = json.loads(row.filter_json) if row.filter_json else {}
        if not isinstance(filt, dict):
            filt = {}
    except json.JSONDecodeError:
        filt = {}
    return {
        "id": row.id,
        "company_slug": row.company_slug,
        "surface": row.surface,
        "name": row.name,
        "filter_json": filt,
        "is_default": bool(row.is_default),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def list_saved_views(
    db: Session,
    *,
    company_slug: str,
    surface: str | None = None,
) -> dict[str, Any]:
    slug = _require_slug(company_slug)
    q = db.query(RecruiterSavedView).filter(RecruiterSavedView.company_slug == slug)
    if surface:
        if surface not in ALLOWED_SURFACES:
            raise ValueError("invalid surface")
        q = q.filter(RecruiterSavedView.surface == surface)
    rows = q.order_by(RecruiterSavedView.updated_at.desc()).all()
    return {"items": [_serialize(r) for r in rows], "count": len(rows)}


def create_saved_view(db: Session, *, company_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    slug = _require_slug(company_slug)
    surface = str(payload.get("surface", "")).strip()
    if surface not in ALLOWED_SURFACES:
        raise ValueError("invalid surface")
    name = str(payload.get("name", "")).strip()
    if not name:
        raise ValueError("name required")
    filt = payload.get("filter_json") or {}
    if not isinstance(filt, dict):
        raise ValueError("filter_json must be object")
    is_default = bool(payload.get("is_default", False))
    if is_default:
        db.query(RecruiterSavedView).filter(
            RecruiterSavedView.company_slug == slug,
            RecruiterSavedView.surface == surface,
        ).update({"is_default": False})
    row = RecruiterSavedView(
        company_slug=slug,
        surface=surface,
        name=name[:120],
        filter_json=json.dumps(filt),
        is_default=is_default,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def update_saved_view(
    db: Session,
    *,
    company_slug: str,
    view_id: int,
    fields: dict[str, Any],
) -> dict[str, Any]:
    slug = _require_slug(company_slug)
    row = (
        db.query(RecruiterSavedView)
        .filter(RecruiterSavedView.id == view_id, RecruiterSavedView.company_slug == slug)
        .first()
    )
    if not row:
        raise ValueError("saved view not found")
    if "name" in fields and fields["name"] is not None:
        row.name = str(fields["name"]).strip()[:120]
    if "filter_json" in fields and fields["filter_json"] is not None:
        if not isinstance(fields["filter_json"], dict):
            raise ValueError("filter_json must be object")
        row.filter_json = json.dumps(fields["filter_json"])
    if "is_default" in fields and fields["is_default"] is not None:
        if fields["is_default"]:
            db.query(RecruiterSavedView).filter(
                RecruiterSavedView.company_slug == slug,
                RecruiterSavedView.surface == row.surface,
            ).update({"is_default": False})
        row.is_default = bool(fields["is_default"])
    row.updated_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


def delete_saved_view(db: Session, *, company_slug: str, view_id: int) -> dict[str, str]:
    slug = _require_slug(company_slug)
    row = (
        db.query(RecruiterSavedView)
        .filter(RecruiterSavedView.id == view_id, RecruiterSavedView.company_slug == slug)
        .first()
    )
    if not row:
        raise ValueError("saved view not found")
    db.delete(row)
    db.commit()
    return {"status": "deleted"}
