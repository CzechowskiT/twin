"""Ops admin dashboards (data quality, product metrics). Bearer token required."""

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.services.admin_metrics import build_admin_metrics
from app.services.admin_placement_queue import build_placement_dispute_queue
from app.services.data_quality_metrics import build_data_quality_report
from app.services.partner_auth import mint_partner_api_key, revoke_partner_api_key
from app.services.placement_verification import ops_resolve_placement_dispute
from app.database.models import PartnerApiKey

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


@router.get("/placement-disputes")
def admin_placement_disputes(
    limit: int = 50,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    return build_placement_dispute_queue(db, limit=limit)


class PlacementDisputeResolveIn(BaseModel):
    resolution: str = Field(..., description="verified | dismissed")
    note: str | None = Field(default=None, max_length=2000)


@router.post("/placement-disputes/{application_id}/resolve")
def admin_resolve_placement_dispute(
    application_id: int,
    body: PlacementDisputeResolveIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        app = ops_resolve_placement_dispute(
            db,
            application_id=application_id,
            resolution=body.resolution,
            note=body.note,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"application_id": app.id, "placement_state": app.placement_state}


class PartnerApiKeyCreateIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    scopes: str = Field(default="export", max_length=255)


@router.get("/partner-api-keys")
def admin_list_partner_api_keys(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    rows = (
        db.query(PartnerApiKey)
        .filter(PartnerApiKey.revoked_at.is_(None))
        .order_by(PartnerApiKey.created_at.desc())
        .limit(50)
        .all()
    )
    return {
        "items": [
            {"id": r.id, "label": r.label, "scopes": r.scopes, "created_at": r.created_at.isoformat()}
            for r in rows
        ]
    }


@router.post("/partner-api-keys")
def admin_create_partner_api_key(
    body: PartnerApiKeyCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    row, raw = mint_partner_api_key(db, label=body.label, scopes=body.scopes)
    return {
        "id": row.id,
        "label": row.label,
        "scopes": row.scopes,
        "token": raw,
        "header": "X-Twin-Partner-Token",
    }


@router.post("/partner-api-keys/{key_id}/revoke")
def admin_revoke_partner_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        revoke_partner_api_key(db, key_id=key_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"id": key_id, "revoked": True}
