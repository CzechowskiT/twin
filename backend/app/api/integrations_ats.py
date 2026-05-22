"""Inbound ATS webhooks (best-effort; extend per vendor contract)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import User
from app.schemas.integrations_ats import (
    AtsConnectOut,
    AtsOAuthConnectionOut,
    AtsProviderSetupOut,
    AtsSetupOut,
)
from app.services import ats_oauth
from app.services.greenhouse_oauth import GreenhouseOAuthError
from app.database.models import Application, ApplicationStatus
from app.database.session import get_db
from app.services.placement_verification import PLACEMENT_VERIFIED, record_placement_event

router = APIRouter()
logger = logging.getLogger(__name__)

_ATS_PROVIDERS: tuple[tuple[str, str, str, str], ...] = (
    ("greenhouse", "Greenhouse", "/api/v1/integrations/ats/greenhouse", "X-Greenhouse-Signature"),
    ("lever", "Lever", "/api/v1/integrations/ats/lever", "X-Lever-Signature"),
    ("ashby", "Ashby", "/api/v1/integrations/ats/ashby", "Ashby-Signature"),
)

_OAUTH_UI_PROVIDERS: tuple[tuple[str, str], ...] = (
    ("greenhouse", "Greenhouse"),
    ("lever", "Lever"),
)


def _secret_configured(settings: Settings, provider: str) -> bool:
    if provider == "greenhouse":
        return bool((settings.greenhouse_webhook_secret or "").strip())
    if provider == "lever":
        return bool((settings.lever_webhook_secret or "").strip())
    if provider == "ashby":
        return bool((settings.ashby_webhook_secret or "").strip())
    return False


def _oauth_connections_for_user(db: Session, user_id: int) -> list[AtsOAuthConnectionOut]:
    rows = {r.provider: r for r in ats_oauth.list_connections(db, user_id)}
    out: list[AtsOAuthConnectionOut] = []
    for pid, label in _OAUTH_UI_PROVIDERS:
        row = rows.get(pid)
        out.append(
            AtsOAuthConnectionOut(
                provider=pid,
                display_name=label,
                status=row.status if row else "not_started",
                oauth_available=ats_oauth.oauth_available(pid),
                oauth_state=row.oauth_state if row else None,
            )
        )
    return out


@router.get("/ats/setup", response_model=AtsSetupOut)
def ats_integration_setup(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    user: User = Depends(get_current_user),
) -> AtsSetupOut:
    """Webhook endpoints and secret status for recruiter ATS configuration UI."""
    base = str(request.base_url).rstrip("/")
    providers = [
        AtsProviderSetupOut(
            provider=pid,
            display_name=label,
            webhook_path=path,
            webhook_url=f"{base}{path}",
            secret_configured=_secret_configured(settings, pid),
            signature_header=sig_header,
        )
        for pid, label, path, sig_header in _ATS_PROVIDERS
    ]
    return AtsSetupOut(
        providers=providers,
        oauth_connections=_oauth_connections_for_user(db, user.id),
        linkage_note=(
            "Set Application.external_ats_id and external_ats_provider on each hire "
            "so hire webhooks can mark placement verified."
        ),
    )


@router.post("/ats/{provider}/connect", response_model=AtsConnectOut)
def ats_oauth_connect(
    provider: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AtsConnectOut:
    """Start ATS OAuth (Greenhouse authorize URL when credentials are configured)."""
    try:
        row, authorize_url = ats_oauth.start_connect(db, user_id=user.id, provider=provider)
    except ValueError as exc:
        if str(exc) == "unsupported_provider":
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown ATS provider.") from exc
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid connect request.") from exc
    except GreenhouseOAuthError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    db.commit()
    pid = row.provider
    available = ats_oauth.oauth_available(pid)
    label = next((n for p, n in _OAUTH_UI_PROVIDERS if p == pid), pid)
    if authorize_url:
        message = f"Redirect to {label} to authorize TWIN."
    else:
        message = (
            f"{label} OAuth is not enabled on this environment yet. "
            "Set GREENHOUSE_CLIENT_ID, GREENHOUSE_CLIENT_SECRET, and GREENHOUSE_OAUTH_REDIRECT_URI "
            "on the API, or use hire webhooks below."
        )
    return AtsConnectOut(
        provider=pid,
        status=row.status,
        oauth_available=available,
        message=message,
        oauth_state=row.oauth_state,
        authorize_url=authorize_url,
    )


@router.get("/ats/greenhouse/callback")
def greenhouse_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    """OAuth redirect target — exchanges code and sends recruiter back to the dashboard."""
    frontend = (settings.frontend_url or "").rstrip("/") or "/"
    dest = f"{frontend}/recruiter/integrations/ats"
    if error or not code or not state:
        return RedirectResponse(url=f"{dest}?oauth=denied", status_code=302)
    try:
        ats_oauth.complete_greenhouse_callback(db, state=state, code=code)
        db.commit()
    except (ValueError, GreenhouseOAuthError):
        db.rollback()
        return RedirectResponse(url=f"{dest}?oauth=error", status_code=302)
    return RedirectResponse(url=f"{dest}?oauth=connected&provider=greenhouse", status_code=302)


def _apply_ats_hire(
    db: Session,
    *,
    provider: str,
    external_id: str,
) -> None:
    row = (
        db.query(Application)
        .filter(
            Application.external_ats_id == external_id,
            Application.external_ats_provider == provider,
        )
        .first()
    )
    if not row:
        logger.info("ATS hire event for unknown external id=%s (%s)", external_id, provider)
        return
    row.status = ApplicationStatus.HIRED
    if row.placement_state != PLACEMENT_VERIFIED:
        row.placement_state = PLACEMENT_VERIFIED
        row.placement_verified_at = datetime.now(timezone.utc)
        record_placement_event(
            db,
            application_id=row.id,
            event_type="placement.ats_hire_confirmed",
            actor="ats_webhook",
            detail={"provider": provider, "external_id": external_id},
            from_magic_link=True,
        )
    db.commit()
    logger.info("ATS webhook marked application %s hired (%s)", row.id, provider)


def _verify_greenhouse_webhook(settings: Settings, body: bytes, header_sig: str | None) -> None:
    """Validate Greenhouse webhook HMAC-SHA256; reject unsigned traffic in production."""
    secret = (settings.greenhouse_webhook_secret or "").strip()
    env = (settings.environment or "").strip().lower()

    if not secret:
        if env in ("production", "staging"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Webhook secret not configured. Set GREENHOUSE_WEBHOOK_SECRET.",
            )
        logger.warning("Greenhouse webhook secret not set — allowing in non-production")
        return

    if not header_sig:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Greenhouse-Signature header",
        )

    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    candidate = header_sig.removeprefix("sha256=").strip()
    if len(candidate) != len(digest) or not hmac.compare_digest(digest, candidate):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook signature",
        )


@router.post("/ats/greenhouse")
async def greenhouse_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    """Receive Greenhouse-style JSON payloads; HMAC-SHA256 over raw body when secret is set."""
    settings = get_settings()
    body = await request.body()
    sig = request.headers.get("X-Greenhouse-Signature") or request.headers.get("X-Hub-Signature-256")
    _verify_greenhouse_webhook(settings, body, sig)

    try:
        payload: dict[str, Any] = json.loads(body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    action = str(payload.get("action") or payload.get("event") or "")
    app_id = payload.get("application", {}).get("id") if isinstance(payload.get("application"), dict) else None
    if app_id is None and isinstance(payload.get("payload"), dict):
        inner = payload["payload"].get("application")
        if isinstance(inner, dict):
            app_id = inner.get("id")

    if action and "hire" in action.lower() and app_id is not None:
        _apply_ats_hire(db, provider="greenhouse", external_id=str(app_id))

    return {"status": "ok"}


def _verify_lever_webhook(settings: Settings, body: bytes, header_sig: str | None) -> None:
    secret = (settings.lever_webhook_secret or "").strip()
    env = (settings.environment or "").strip().lower()
    if not secret:
        if env in ("production", "staging"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Webhook secret not configured. Set LEVER_WEBHOOK_SECRET.",
            )
        logger.warning("Lever webhook secret not set — allowing in non-production")
        return
    if not header_sig or not hmac.compare_digest(
        header_sig.strip(),
        hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest(),
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid Lever webhook signature")


@router.post("/ats/lever")
async def lever_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    """Lever hire events — HMAC via X-Lever-Signature when LEVER_WEBHOOK_SECRET is set."""
    settings = get_settings()
    body = await request.body()
    _verify_lever_webhook(settings, body, request.headers.get("X-Lever-Signature"))

    try:
        payload: dict[str, Any] = json.loads(body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    event = str(payload.get("event") or payload.get("type") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    app_id = None
    if isinstance(data, dict):
        app_id = data.get("applicationId") or data.get("application_id")
    if event and "hire" in event.lower() and app_id is not None:
        _apply_ats_hire(db, provider="lever", external_id=str(app_id))

    return {"status": "ok"}


def _verify_ashby_webhook(settings: Settings, body: bytes, header_sig: str | None) -> None:
    secret = (settings.ashby_webhook_secret or "").strip()
    env = (settings.environment or "").strip().lower()
    if not secret:
        if env in ("production", "staging"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Webhook secret not configured. Set ASHBY_WEBHOOK_SECRET.",
            )
        logger.warning("Ashby webhook secret not set — allowing in non-production")
        return
    if not header_sig:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Missing Ashby-Signature header")
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    expected = f"sha256={digest}"
    if not hmac.compare_digest(expected, header_sig.strip()):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid Ashby webhook signature")


@router.post("/ats/ashby")
async def ashby_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    """Ashby hire events — HMAC via Ashby-Signature (sha256=…) when ASHBY_WEBHOOK_SECRET is set."""
    settings = get_settings()
    body = await request.body()
    _verify_ashby_webhook(settings, body, request.headers.get("Ashby-Signature"))

    try:
        payload: dict[str, Any] = json.loads(body.decode("utf-8") or "{}")
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    event = str(payload.get("eventName") or payload.get("type") or payload.get("event") or "")
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    app_id = None
    if isinstance(data, dict):
        app = data.get("application")
        if isinstance(app, dict):
            app_id = app.get("id")
        app_id = app_id or data.get("applicationId") or data.get("application_id")
    if event and "hire" in event.lower() and app_id is not None:
        _apply_ats_hire(db, provider="ashby", external_id=str(app_id))

    return {"status": "ok"}
