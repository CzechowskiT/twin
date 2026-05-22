"""Ops-only endpoints (Bearer OPS_ADMIN_TOKEN)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.admin_ops import _require_ops_admin
from app.config import Settings, get_settings
from app.core.deps import get_db
from app.database.models import AutoApplyRun
from app.schemas.ops import AutoApplyLastRunOut

router = APIRouter()


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
