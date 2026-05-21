"""Ops admin dashboards (data quality, product metrics). Bearer token required."""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.services.admin_metrics import build_admin_metrics
from app.services.data_quality_metrics import build_data_quality_report

router = APIRouter()


def _require_ops_admin(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


@router.get("/data-quality")
def admin_data_quality(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    return build_data_quality_report(db)


@router.get("/metrics")
def admin_metrics(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    return build_admin_metrics(db)
