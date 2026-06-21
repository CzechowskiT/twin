"""Ops admin dashboards (data quality, product metrics). Bearer token required."""

from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.database.models import PartnerApiKey, RecruiterCompanyToken
from app.services.admin_metrics import build_admin_metrics
from app.services.market_coverage_status import build_market_coverage_status
from app.services.matching_quality_metrics import build_matching_quality_metrics
from app.services.admin_placement_queue import build_placement_dispute_queue
from app.services.data_quality_metrics import build_data_quality_report
from app.services.partner_auth import mint_partner_api_key, revoke_partner_api_key
from app.services.placement_verification import ops_resolve_placement_dispute
from app.services.recruiter_company_auth import mint_recruiter_company_token, revoke_recruiter_company_token

router = APIRouter()


def _require_ops_admin(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


EXPECTED_ALEMBIC_HEAD = "068_placement_events_foundation"


def _read_alembic_current(db: Session) -> str | None:
    """Read-only Alembic revision from alembic_version — no secrets."""
    try:
        row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
        return str(row[0]) if row and row[0] else None
    except Exception:
        return None


@router.get("/migrations/current")
def admin_migrations_current(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Read-only Alembic current vs expected repo head — ops admin only."""
    _require_ops_admin(settings, authorization)
    current = _read_alembic_current(db)
    head = EXPECTED_ALEMBIC_HEAD
    return {
        "current_revision": current,
        "head_revision": head,
        "head_revisions": [head],
        "is_at_head": current == head if current else False,
        "read_only": True,
    }


@router.get("/deploy-health")
def admin_deploy_health(
    db: bool = True,
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Full deploy audit (redirect URIs, data-room flags) — replaces public health?ops=1 detail."""
    from app.api.health import _database_reachable, _git_commit_sha
    from app.services.health_ops import build_health_ops_admin_extensions, build_health_ops_public

    _require_ops_admin(settings, authorization)
    commit = _git_commit_sha()
    out: dict = {
        "status": "ok",
        "service": "twin-api",
        "git_commit": commit if commit else "unknown",
    }
    if db:
        out["db_ok"] = _database_reachable()
    out.update(build_health_ops_public(settings))
    out.update(build_health_ops_admin_extensions(settings))
    return out


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


@router.get("/market-coverage-status")
def admin_market_coverage_status(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Autonomous scrape telemetry + active feed progress toward 10k target."""
    _require_ops_admin(settings, authorization)
    return build_market_coverage_status(db)


@router.get("/matching-quality")
def admin_matching_quality(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Founding-cohort matching quality KPIs (feedback rates, median scores)."""
    _require_ops_admin(settings, authorization)
    return build_matching_quality_metrics(db)


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


class RecruiterCompanyTokenCreateIn(BaseModel):
    company_slug: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)


@router.get("/recruiter-company-tokens")
def admin_list_recruiter_company_tokens(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    rows = (
        db.query(RecruiterCompanyToken)
        .filter(RecruiterCompanyToken.revoked_at.is_(None))
        .order_by(RecruiterCompanyToken.created_at.desc())
        .limit(50)
        .all()
    )
    base = settings.frontend_url.rstrip("/")
    return {
        "items": [
            {
                "id": r.id,
                "label": r.label,
                "company_slug": r.company_slug,
                "inbox_path": f"/recruiter/inbox?company_slug={r.company_slug}",
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
        "frontend_base": base,
    }


@router.post("/recruiter-company-tokens")
def admin_create_recruiter_company_token(
    body: RecruiterCompanyTokenCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    row, raw = mint_recruiter_company_token(db, company_slug=body.company_slug, label=body.label)
    base = settings.frontend_url.rstrip("/")
    return {
        "id": row.id,
        "label": row.label,
        "company_slug": row.company_slug,
        "token": raw,
        "header": "X-Twin-Recruiter-Token",
        "inbox_url": f"{base}/recruiter/inbox?token={raw}&company_slug={row.company_slug}",
    }


@router.post("/recruiter-company-tokens/{token_id}/revoke")
def admin_revoke_recruiter_company_token(
    token_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    _require_ops_admin(settings, authorization)
    try:
        revoke_recruiter_company_token(db, token_id=token_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"id": token_id, "revoked": True}
