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
from app.services.product_funnel import build_cohort_retention, build_funnel_snapshot
from app.services.recruiter_company_auth import mint_recruiter_company_token, revoke_recruiter_company_token

router = APIRouter()


def _require_ops_admin(settings: Settings, authorization: str | None) -> None:
    token = settings.ops_admin_token.strip() or settings.beta_admin_token.strip()
    if not token:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Ops admin token not configured")
    if (authorization or "").strip() != f"Bearer {token}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")


# Keep in sync with alembic head (121_decision_calendar_capacity_planning).
EXPECTED_ALEMBIC_HEAD = "121_decision_calendar_capacity_planning"


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


@router.get("/funnel")
def admin_funnel(
    days: int = 30,
    date_from: str | None = None,
    date_to: str | None = None,
    cohort: str | None = None,
    persona: str | None = None,
    environment: str | None = None,
    include_test_accounts: bool = False,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Product funnel snapshot — north star + conversion + activation TTV (ops admin)."""
    _require_ops_admin(settings, authorization)
    from datetime import datetime

    def _parse(ts: str | None) -> datetime | None:
        if not ts:
            return None
        raw = ts.strip().replace("Z", "")
        try:
            return datetime.fromisoformat(raw)
        except ValueError:
            return None

    return build_funnel_snapshot(
        db,
        days=days,
        date_from=_parse(date_from),
        date_to=_parse(date_to),
        persona=persona,
        include_test_accounts=include_test_accounts,
        cohort=cohort,
        environment=environment,
    )


@router.get("/retention")
def admin_retention(
    weeks: int = 8,
    include_test_accounts: bool = False,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Signup-week cohort retention (D7/D30) for growth readiness."""
    _require_ops_admin(settings, authorization)
    return build_cohort_retention(db, weeks=weeks, include_test_accounts=include_test_accounts)


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


class ActivationCohortCreateIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    cohort_type: str = Field(default="candidate", max_length=32)
    market: str = Field(default="PL", max_length=64)
    language: str = Field(default="pl", max_length=16)
    starts_at: str | None = None
    ends_at: str | None = None
    target_count: int = Field(default=50, ge=1, le=10000)
    status: str = Field(default="draft", max_length=32)
    owner: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=128)
    campaign: str | None = Field(default=None, max_length=128)
    notes: str | None = None


class ActivationCohortUpdateIn(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    cohort_type: str | None = Field(default=None, max_length=32)
    market: str | None = Field(default=None, max_length=64)
    language: str | None = Field(default=None, max_length=16)
    starts_at: str | None = None
    ends_at: str | None = None
    target_count: int | None = Field(default=None, ge=1, le=10000)
    status: str | None = Field(default=None, max_length=32)
    owner: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=128)
    campaign: str | None = Field(default=None, max_length=128)
    notes: str | None = None


class ActivationParticipantIn(BaseModel):
    user_id: int | None = None
    email: str | None = Field(default=None, max_length=320)
    role: str = Field(default="candidate", max_length=32)
    source: str | None = Field(default=None, max_length=128)
    status: str = Field(default="joined", max_length=32)
    exclude_from_product_metrics: bool | None = None
    notes: str | None = None


class ActivationParticipantUpdateIn(BaseModel):
    role: str | None = Field(default=None, max_length=32)
    source: str | None = Field(default=None, max_length=128)
    status: str | None = Field(default=None, max_length=32)
    exclude_from_product_metrics: bool | None = None
    notes: str | None = None


@router.get("/cohorts")
def admin_list_cohorts(
    status: str | None = None,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """List activation pilot cohorts (ops admin)."""
    from app.services.activation_cohorts import list_cohorts

    _require_ops_admin(settings, authorization)
    return {"cohorts": list_cohorts(db, status=status)}


@router.post("/cohorts")
def admin_create_cohort(
    body: ActivationCohortCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import cohort_to_dict, create_cohort

    _require_ops_admin(settings, authorization)
    try:
        cohort = create_cohort(db, body.model_dump())
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return cohort_to_dict(cohort, participant_count=0)


@router.post("/cohorts/ensure-pl-pilot")
def admin_ensure_pl_pilot_cohort(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Idempotent seed of the PL activation pilot cohort (does not invite users)."""
    from app.services.activation_cohorts import cohort_to_dict, ensure_default_pl_pilot_cohort

    _require_ops_admin(settings, authorization)
    cohort = ensure_default_pl_pilot_cohort(db)
    return cohort_to_dict(cohort)


@router.get("/cohorts/{cohort_id}")
def admin_get_cohort(
    cohort_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import cohort_to_dict, get_cohort, list_participants

    _require_ops_admin(settings, authorization)
    cohort = get_cohort(db, cohort_id)
    if not cohort:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    participants = list_participants(db, cohort_id)
    return {**cohort_to_dict(cohort, participant_count=len(participants)), "participants": participants}


@router.patch("/cohorts/{cohort_id}")
def admin_update_cohort(
    cohort_id: int,
    body: ActivationCohortUpdateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import cohort_to_dict, update_cohort

    _require_ops_admin(settings, authorization)
    try:
        cohort = update_cohort(db, cohort_id, body.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return cohort_to_dict(cohort)


@router.get("/cohorts/{cohort_id}/evidence")
def admin_cohort_evidence(
    cohort_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Cohort evidence: step counts, TTV sample, NS excl/incl test, blockers."""
    from app.services.activation_cohorts import build_cohort_evidence

    _require_ops_admin(settings, authorization)
    try:
        return build_cohort_evidence(db, cohort_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/cohorts/{cohort_id}/participants")
def admin_list_participants(
    cohort_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import get_cohort, list_participants

    _require_ops_admin(settings, authorization)
    if not get_cohort(db, cohort_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cohort not found")
    return {"participants": list_participants(db, cohort_id)}


@router.post("/cohorts/{cohort_id}/participants")
def admin_add_participant(
    cohort_id: int,
    body: ActivationParticipantIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services import platform_foundations as foundations
    from app.services.activation_cohorts import add_participant, participant_to_dict

    _require_ops_admin(settings, authorization)
    foundations.seed_system_roles(db)
    # Allow metrics-excluded smoke/demo participants for internal testing only.
    smoke_ok = bool(body.exclude_from_product_metrics)
    if not foundations.is_external_pilot_enrollment_enabled(db) and not smoke_ok:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail=(
                "EXTERNAL_PILOT_ENROLLMENT_ENABLED is false — Pilot BLOCKED_BY_FOUNDER. "
                "Do not add real participants. Smoke-only adds require exclude_from_product_metrics=true."
            ),
        )
    try:
        part = add_participant(
            db,
            cohort_id,
            user_id=body.user_id,
            email=body.email,
            role=body.role,
            source=body.source,
            status=body.status,
            exclude_from_product_metrics=body.exclude_from_product_metrics,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return participant_to_dict(part)


@router.patch("/cohorts/{cohort_id}/participants/{participant_id}")
def admin_update_participant(
    cohort_id: int,
    participant_id: int,
    body: ActivationParticipantUpdateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import participant_to_dict, update_participant

    _require_ops_admin(settings, authorization)
    try:
        part = update_participant(
            db,
            cohort_id,
            participant_id,
            body.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return participant_to_dict(part)


@router.delete("/cohorts/{cohort_id}/participants/{participant_id}")
def admin_remove_participant(
    cohort_id: int,
    participant_id: int,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.activation_cohorts import remove_participant

    _require_ops_admin(settings, authorization)
    try:
        remove_participant(db, cohort_id, participant_id)
    except ValueError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"id": participant_id, "removed": True}


class PrivacyFulfillIn(BaseModel):
    fulfillment_status: str = Field(..., min_length=3, max_length=32)
    delivery_receipt: dict | None = None


class PrivacyLegalHoldIn(BaseModel):
    legal_hold: bool = True


class PrivacyOpsCreateIn(BaseModel):
    candidate_id: int = Field(..., ge=1)
    request_type: str = Field(..., min_length=3, max_length=64)
    payload: dict | None = None
    legal_hold: bool = False


@router.get("/privacy/dsr-queue")
def admin_privacy_dsr_queue(
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Ops DSR queue — no public enrollment; Bearer ops token only."""
    from app.services.candidate_privacy_request_service import list_privacy_ops_queue

    _require_ops_admin(settings, authorization)
    return list_privacy_ops_queue(
        db, status_filter=status_filter, limit=min(limit, 200), offset=max(offset, 0)
    )


@router.post("/privacy/dsr-queue", status_code=status.HTTP_201_CREATED)
def admin_privacy_dsr_create(
    body: PrivacyOpsCreateIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.candidate_privacy_request_service import create_ops_privacy_request

    _require_ops_admin(settings, authorization)
    try:
        return create_ops_privacy_request(
            db,
            candidate_id=body.candidate_id,
            actor_user_id=None,
            request_type=body.request_type,
            payload=body.payload,
            legal_hold=body.legal_hold,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/privacy/dsr-queue/{request_id}/legal-hold")
def admin_privacy_dsr_legal_hold(
    request_id: int,
    body: PrivacyLegalHoldIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.candidate_privacy_request_service import set_privacy_request_legal_hold

    _require_ops_admin(settings, authorization)
    try:
        return set_privacy_request_legal_hold(
            db,
            request_id=request_id,
            legal_hold=body.legal_hold,
            actor_user_id=None,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/privacy/dsr-queue/{request_id}/fulfill")
def admin_privacy_dsr_fulfill(
    request_id: int,
    body: PrivacyFulfillIn,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    from app.services.candidate_privacy_request_service import fulfill_privacy_request

    _require_ops_admin(settings, authorization)
    try:
        return fulfill_privacy_request(
            db,
            request_id=request_id,
            actor_user_id=None,
            fulfillment_status=body.fulfillment_status,
            delivery_receipt=body.delivery_receipt,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

