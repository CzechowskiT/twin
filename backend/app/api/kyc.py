"""Identity verification (Authologic KYC) — start flow, sync status, provider callback."""

from __future__ import annotations

import logging
from typing import Annotated

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import IdentityVerification, User
from app.database.session import get_db
from app.schemas.kyc import (
    AuthologicStartRequest,
    AuthologicStartResponse,
    KycConfiguredOut,
    KycStatusOut,
    KycSyncBody,
)
from app.services import authologic_client
from app.services import kyc_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_callback_token(settings: Settings, request: Request) -> None:
    expected = settings.authologic_callback_token.strip()
    if not expected:
        return
    got = request.query_params.get("t") or ""
    if got != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid callback token")


@router.get("/authologic/configured", response_model=KycConfiguredOut)
def authologic_configured(settings: Annotated[Settings, Depends(get_settings)]) -> KycConfiguredOut:
    return KycConfiguredOut(configured=authologic_client.is_authologic_configured(settings))


@router.get("/status", response_model=KycStatusOut)
def kyc_status(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> KycStatusOut:
    latest = (
        db.query(IdentityVerification)
        .filter(IdentityVerification.user_id == user.id)
        .order_by(IdentityVerification.id.desc())
        .first()
    )
    return KycStatusOut(
        identity_verified_at=user.identity_verified_at,
        latest_conversation_id=latest.conversation_id if latest else None,
        conversation_status=latest.conversation_status if latest else None,
        identity_status=latest.identity_status if latest else None,
    )


@router.post("/authologic/start", response_model=AuthologicStartResponse)
def authologic_start(
    body: AuthologicStartRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthologicStartResponse:
    if not body.identity_provider_processing_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit consent is required before starting identity verification.",
        )
    if not authologic_client.is_authologic_configured(settings):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity verification is not configured on this server.",
        )
    user.identity_provider_processing_consent_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    try:
        row = kyc_service.start_verification_session(db, user, settings)
    except authologic_client.AuthologicClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e) or "Authologic request failed",
        ) from e

    if not row.redirect_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Authologic did not return a redirect URL.",
        )
    return AuthologicStartResponse(redirect_url=row.redirect_url, conversation_id=row.conversation_id)


@router.post("/authologic/sync", response_model=KycStatusOut)
def authologic_sync(
    body: KycSyncBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> KycStatusOut:
    if not authologic_client.is_authologic_configured(settings):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity verification is not configured on this server.",
        )
    row = (
        db.query(IdentityVerification)
        .filter(
            IdentityVerification.conversation_id == body.conversation_id,
            IdentityVerification.user_id == user.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown conversation")

    try:
        kyc_service.sync_verification_for_conversation(db, conversation_id=body.conversation_id, settings=settings)
    except authologic_client.AuthologicClientError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e) or "Authologic request failed",
        ) from e

    db.refresh(user)
    latest = (
        db.query(IdentityVerification)
        .filter(IdentityVerification.user_id == user.id)
        .order_by(IdentityVerification.id.desc())
        .first()
    )
    return KycStatusOut(
        identity_verified_at=user.identity_verified_at,
        latest_conversation_id=latest.conversation_id if latest else None,
        conversation_status=latest.conversation_status if latest else None,
        identity_status=latest.identity_status if latest else None,
    )


@router.api_route(
    "/authologic/callback",
    methods=["GET", "POST"],
    response_model=KycStatusOut,
    include_in_schema=False,
)
def authologic_callback(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    conversation: Annotated[str | None, Query(alias="conversation")] = None,
) -> KycStatusOut:
    """Authologic server callback — re-fetch state from their API (do not trust body for PII)."""
    _verify_callback_token(settings, request)
    if not authologic_client.is_authologic_configured(settings):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Identity verification is not configured on this server.",
        )
    conv_id = conversation or request.query_params.get("conversationId")
    if not conv_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing conversation id")

    try:
        updated = kyc_service.sync_verification_for_conversation(db, conversation_id=conv_id, settings=settings)
    except authologic_client.AuthologicClientError as e:
        logger.warning("Authologic callback sync failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e) or "Authologic request failed",
        ) from e

    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown conversation")

    user = db.query(User).filter(User.id == updated.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User missing")

    return KycStatusOut(
        identity_verified_at=user.identity_verified_at,
        latest_conversation_id=updated.conversation_id,
        conversation_status=updated.conversation_status,
        identity_status=updated.identity_status,
    )
