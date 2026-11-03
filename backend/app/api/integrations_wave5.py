"""Integrations Wave 5 API — calendar/ICS portability + capability-split inventory."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.database.models import User
from app.services import integrations_wave5 as wave5


def _public_api_base() -> str | None:
    import os

    for key in ("API_URL", "RAILWAY_SERVICE_TWIN_URL"):
        v = (os.environ.get(key) or "").strip().rstrip("/")
        if v.startswith("https://"):
            return v
    domain = (os.environ.get("RAILWAY_PUBLIC_DOMAIN") or "").strip()
    if domain:
        return f"https://{domain}"
    return None

router = APIRouter()


class EvidenceMarkIn(BaseModel):
    module_id: str = Field(..., min_length=2, max_length=128)
    status: str = Field(
        ...,
        pattern=r"^(PASS|FAIL|PENDING_SMOKE|HELD_POLICY|PARTIAL|DEMO_ONLY)$",
    )
    smoke_sha: str | None = Field(None, max_length=64)
    notes: str | None = Field(None, max_length=2000)


class IcsPreviewIn(BaseModel):
    cancelled: bool = False
    sequence: int = Field(0, ge=0, le=999)


class EmailDraftIn(BaseModel):
    body_preview: str = Field("", max_length=500)
    send: bool = False


class WebhookVerifyIn(BaseModel):
    provider: str = Field("ats", min_length=2, max_length=64)
    payload: str = Field(..., min_length=1, max_length=4000)
    signature: str = Field(..., min_length=8, max_length=128)
    secret: str = Field(..., min_length=8, max_length=128)
    idempotency_key: str | None = Field(None, max_length=128)


class CsvExportIn(BaseModel):
    rows: list[dict[str, str]] = Field(default_factory=list, max_length=100)


@router.get("/status")
def get_wave5_status(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.wave5_status(db)


@router.get("/hard-live/evidence")
def get_hard_live_evidence(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
    persona: str | None = Query(default="platform", max_length=32),
    wave: str | None = Query(default="5", max_length=16),
) -> dict:
    return wave5.list_hard_live_evidence(db, persona=persona, wave=wave)


@router.post("/hard-live/evidence/mark", status_code=status.HTTP_200_OK)
def mark_hard_live_evidence(
    body: EvidenceMarkIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    """Authenticated mark after smoke — does not flip Gate F / Launch / Pilot."""
    try:
        return wave5.mark_evidence_after_smoke(
            db,
            module_id=body.module_id,
            status=body.status,
            smoke_sha=body.smoke_sha,
            notes=body.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.get("/integration-inventory")
def get_integration_inventory(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.integration_inventory(db)


@router.get("/policy-holds")
def get_policy_holds(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.policy_holds()


@router.get("/oauth-providers")
def get_oauth_providers(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.oauth_providers_status()


@router.get("/google/honesty")
def get_google_honesty(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return wave5.google_calendar_capability_honesty(db, user)


@router.get("/microsoft/honesty")
def get_microsoft_honesty(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.ms_calendar_capability_honesty()


@router.get("/ats/honesty")
def get_ats_honesty(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.ats_capability_honesty()


@router.post("/ics/preview")
def post_ics_preview(
    body: IcsPreviewIn,
    _user: User = Depends(get_current_user),
) -> dict:
    """Synthetic ICS — never writes to Google/Microsoft calendars."""
    return wave5.ics_preview(cancelled=body.cancelled, sequence=body.sequence)


@router.get("/webcal/preview")
def get_webcal_preview(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.webcal_feed_preview()


@router.post("/webcal/mint")
def post_webcal_mint(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        wave5.assert_smoke_user_safe(user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return wave5.mint_webcal_token_for_user(db, user)


@router.post("/email/draft", status_code=status.HTTP_201_CREATED)
def post_email_draft(
    body: EmailDraftIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    try:
        return wave5.draft_email_only(
            db, user=user, body_preview=body.body_preview, send=body.send
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/webhook/verify-dry-run")
def post_webhook_verify_dry_run(
    body: WebhookVerifyIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.webhook_verify_dry_run(
        db,
        provider=body.provider,
        payload=body.payload,
        signature=body.signature,
        secret=body.secret,
        idempotency_key=body.idempotency_key,
    )


@router.get("/webhook/attempts")
def get_webhook_attempts(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict:
    return wave5.list_webhook_attempts(db, limit=limit)


@router.post("/csv/export-safe")
def post_csv_export_safe(
    body: CsvExportIn,
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.csv_export_safe(body.rows)


@router.get("/storage/honesty")
def get_storage_honesty(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.storage_honesty()


@router.get("/security-review")
def get_security_review(
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.security_review()


@router.get("/observability/metrics")
def get_observability_metrics(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    return wave5.observability_metrics(db)


@router.get("/notifications/prefs")
def get_notifications_prefs(
    user: User = Depends(get_current_user),
) -> dict:
    return wave5.notifications_prefs_snapshot(user)


@router.get("/connectors/status")
def get_connectors_status(
    _user: User = Depends(get_current_user),
) -> dict:
    from app.services.external_connectors import all_connector_statuses
    from app.services.object_storage import storage_backend_status

    return {
        **all_connector_statuses(public_api_base=_public_api_base()),
        "storage": storage_backend_status(),
    }


@router.get("/google-push/status")
def get_google_push_status(
    _user: User = Depends(get_current_user),
) -> dict:
    from app.services.google_calendar_push import google_push_status

    return google_push_status()


class ConnectorDraftIn(BaseModel):
    connector: str = Field(..., pattern=r"^(slack|teams)$")
    title: str = Field("TWIN draft", max_length=120)
    body: str = Field("preview", max_length=2000)
    deliver: bool = False


class ZapierSubscribeIn(BaseModel):
    target_url: str = Field(..., min_length=12, max_length=512)
    event_filter: str | None = Field("twin.connector.test", max_length=128)


@router.post("/connectors/draft")
def post_connector_draft(
    body: ConnectorDraftIn,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> dict:
    from app.services.external_connectors import draft_notification, internal_test_post

    if body.deliver:
        return internal_test_post(
            db, connector=body.connector, title=body.title, body=body.body
        )
    return draft_notification(connector=body.connector, title=body.title, body=body.body)


@router.post("/connectors/zapier/subscriptions")
def post_zapier_subscription(
    body: ZapierSubscribeIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from app.services.zapier_generic_webhook import create_subscription

    try:
        return create_subscription(
            db,
            user_id=user.id,
            target_url=body.target_url,
            event_filter=body.event_filter,
            public_api_base=_public_api_base(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/connectors/zapier/subscriptions/{subscription_id}/test")
def post_zapier_test_event(
    subscription_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    force_fail: bool = Query(False),
) -> dict:
    from app.services.zapier_generic_webhook import deliver_test_event

    try:
        return deliver_test_event(
            db, user_id=user.id, subscription_id=subscription_id, force_fail=force_fail
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/connectors/zapier/subscriptions/{subscription_id}/rotate")
def post_zapier_rotate(
    subscription_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from app.services.zapier_generic_webhook import rotate_secret

    try:
        return rotate_secret(db, user_id=user.id, subscription_id=subscription_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/connectors/zapier/subscriptions/{subscription_id}/revoke")
def post_zapier_revoke(
    subscription_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    from app.services.zapier_generic_webhook import revoke_subscription

    try:
        return revoke_subscription(db, user_id=user.id, subscription_id=subscription_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc


@router.post("/connectors/test-receiver")
async def post_connector_test_receiver(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Public HTTPS internal Zapier smoke receiver — signature required."""
    from app.services.zapier_generic_webhook import receive_test_event
    from fastapi.responses import JSONResponse

    raw = await request.body()
    signature = request.headers.get("X-Twin-Signature")
    event_id = request.headers.get("X-Twin-Event-Id")
    sub_raw = request.headers.get("X-Twin-Subscription-Id")
    subscription_id = int(sub_raw) if sub_raw and sub_raw.isdigit() else None
    result = receive_test_event(
        db,
        raw_body=raw,
        signature=signature,
        event_id=event_id,
        subscription_id=subscription_id,
    )
    return JSONResponse(result, status_code=int(result.get("http_status") or 200))


@router.post("/connectors/storage/smoke")
def post_storage_smoke(
    user: User = Depends(get_current_user),
) -> dict:
    from app.services.object_storage import storage_smoke_roundtrip

    return storage_smoke_roundtrip(tenant_id=f"user-{user.id}")
