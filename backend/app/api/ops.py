"""Ops-only endpoints (Bearer OPS_ADMIN_TOKEN)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.admin_ops import _require_ops_admin
from app.config import Settings, get_settings
from app.core.deps import get_db
from app.database.models import AutoApplyRun
from app.schemas.ops import AutoApplyLastRunOut
from app.services.investor_demo_seed import DEMO_RECRUITER_COMPANY, ensure_recruiter_inbox_demo
from app.services.recruiter_inbox import build_recruiter_batch
from app.utils.slug import slugify_company

router = APIRouter()


class RecruiterInboxRefreshIn(BaseModel):
    company: str = Field(default=DEMO_RECRUITER_COMPANY, min_length=1, max_length=255)


@router.get("/auto-apply/last-run", response_model=AutoApplyLastRunOut | None)
def ops_auto_apply_last_run(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> AutoApplyLastRunOut | None:
    """Latest nightly auto-apply sweep (ops token)."""
    _require_ops_admin(settings, authorization)
    row = db.query(AutoApplyRun).order_by(AutoApplyRun.started_at.desc()).first()
    if not row:
        return None
    return AutoApplyLastRunOut.model_validate(row)


@router.post("/demo/recruiter-inbox-refresh")
def ops_refresh_recruiter_inbox_demo(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
    body: RecruiterInboxRefreshIn | None = None,
) -> dict:
    """Reset investor-demo recruiter inbox rows to APPLIED (ops token; no DATABASE_URL CLI)."""
    _require_ops_admin(settings, authorization)
    company = body.company if body else DEMO_RECRUITER_COMPANY
    slug = slugify_company(company)
    before = build_recruiter_batch(db, company_slug=slug)
    summary = ensure_recruiter_inbox_demo(db, company=company)
    db.commit()
    after = build_recruiter_batch(db, company_slug=slug)
    return {
        **summary,
        "company_slug": slug,
        "inbox_before_total": before["total"],
        "inbox_after_total": after["total"],
        "inbox_applied": sum(1 for item in after["items"] if item["status"] == "applied"),
    }
