"""Partner integration hub — Pracuj.pl and LinkedIn Hiring connect stubs."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import RecruiterAtsOAuthConnection, User
from app.database.session import get_db
from app.services.token_crypto import encrypt_secret

router = APIRouter()

_PRACUJ_IDS = frozenset({"pracuj-erecruiter", "pracuj-strefa", "pracuj-softgarden"})
_LINKEDIN_HIRING_IDS = frozenset(
    {
        "linkedin-recruiter",
        "linkedin-hiring-pro",
        "linkedin-recruiter-lite",
    }
)


class IntegrationConnectIn(BaseModel):
    integration_id: str = Field(min_length=3, max_length=64)
    api_key: str | None = Field(default=None, max_length=512)
    account_id: str | None = Field(default=None, max_length=255)
    gdpr_consent: bool = False


class IntegrationConnectOut(BaseModel):
    integration_id: str
    status: str
    message: str
    authorize_url: str | None = None


class IntegrationStatusOut(BaseModel):
    integration_id: str
    status: str
    external_account_id: str | None = None


class IntegrationHubStatusOut(BaseModel):
    connections: dict[str, IntegrationStatusOut]


def _provider_key(integration_id: str) -> str:
    return integration_id.replace("-", "_")[:32]


def _upsert_connection(
    db: Session,
    *,
    user_id: int,
    integration_id: str,
    account_id: str | None,
    api_key: str | None,
    status: str,
) -> RecruiterAtsOAuthConnection:
    pid = _provider_key(integration_id)
    now = datetime.now(timezone.utc)
    row = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(
            RecruiterAtsOAuthConnection.user_id == user_id,
            RecruiterAtsOAuthConnection.provider == pid,
        )
        .first()
    )
    encrypted = encrypt_secret(api_key.strip()) if api_key and api_key.strip() else None
    if row:
        row.status = status
        row.external_account_id = account_id
        row.oauth_access_token_encrypted = encrypted
        row.updated_at = now
    else:
        row = RecruiterAtsOAuthConnection(
            user_id=user_id,
            provider=pid,
            status=status,
            external_account_id=account_id,
            oauth_access_token_encrypted=encrypted,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.flush()
    return row


def _hub_connections(db: Session, user_id: int) -> dict[str, IntegrationStatusOut]:
    rows = (
        db.query(RecruiterAtsOAuthConnection)
        .filter(RecruiterAtsOAuthConnection.user_id == user_id)
        .all()
    )
    out: dict[str, IntegrationStatusOut] = {}
    for row in rows:
        integration_id = row.provider.replace("_", "-")
        out[integration_id] = IntegrationStatusOut(
            integration_id=integration_id,
            status=row.status,
            external_account_id=row.external_account_id,
        )
    return out


def is_pracuj_integration_configured(settings: Settings) -> bool:
    return bool((settings.pracuj_partner_api_enabled or "").strip().lower() in ("1", "true", "yes"))


@router.get("/hub/status", response_model=IntegrationHubStatusOut)
def integration_hub_status(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> IntegrationHubStatusOut:
    return IntegrationHubStatusOut(connections=_hub_connections(db, user.id))


@router.post("/pracuj/connect", response_model=IntegrationConnectOut)
def pracuj_connect(
    body: IntegrationConnectIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectOut:
    iid = body.integration_id.strip()
    if iid not in _PRACUJ_IDS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown Pracuj integration.")

    if iid in {"pracuj-erecruiter", "pracuj-strefa"}:
        if not body.gdpr_consent:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="GDPR consent required for CV and candidate data from Strefa Pracuj.pl.",
            )
        if not (body.api_key or "").strip() or not (body.account_id or "").strip():
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail="account_id and api_key are required.",
            )
        row = _upsert_connection(
            db,
            user_id=user.id,
            integration_id=iid,
            account_id=(body.account_id or "").strip(),
            api_key=(body.api_key or "").strip(),
            status="connected",
        )
        db.commit()
        return IntegrationConnectOut(
            integration_id=iid,
            status=row.status,
            message="Pracuj integration saved. TWIN will sync when partner API credentials are live.",
        )

    row = _upsert_connection(
        db,
        user_id=user.id,
        integration_id=iid,
        account_id=None,
        api_key=None,
        status="coming_soon",
    )
    db.commit()
    partner = is_pracuj_integration_configured(settings)
    return IntegrationConnectOut(
        integration_id=iid,
        status=row.status,
        message=(
            "softgarden partner API is not public yet — connection recorded as coming soon."
            if not partner
            else "softgarden connect stub acknowledged."
        ),
    )


@router.post("/linkedin-hiring/connect", response_model=IntegrationConnectOut)
def linkedin_hiring_connect(
    body: IntegrationConnectIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectOut:
    iid = body.integration_id.strip()
    if iid not in _LINKEDIN_HIRING_IDS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unknown LinkedIn Hiring integration.")

    client_id = (settings.linkedin_hiring_client_id or "").strip()
    row = _upsert_connection(
        db,
        user_id=user.id,
        integration_id=iid,
        account_id=None,
        api_key=None,
        status="coming_soon" if not client_id else "pending",
    )
    db.commit()

    if client_id:
        return IntegrationConnectOut(
            integration_id=iid,
            status=row.status,
            message=(
                "LinkedIn Recruiter OAuth is separate from candidate LinkedIn sign-in. "
                "Partner authorization URL ships when LinkedIn approves hiring scopes."
            ),
            authorize_url=None,
        )

    return IntegrationConnectOut(
        integration_id=iid,
        status=row.status,
        message=(
            "LinkedIn Hiring OAuth stub — set LINKEDIN_HIRING_CLIENT_ID and "
            "LINKEDIN_HIRING_CLIENT_SECRET on the API when partner credentials arrive."
        ),
    )
