"""Least-privilege Founder authorization for the private canary control plane."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Any

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.security import create_access_token_claims, decode_access_token_claims
from app.database.models import CandidateAuthSession, User
from app.database.session import get_db
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_FOUNDER_CANARY_ADMIN
from app.services.candidate_auth_session_constants import (
    MANAGED_CLAIM_EPOCH,
    MANAGED_CLAIM_SID,
    MANAGED_CLAIM_TYP,
    STATE_ACTIVE,
)
from app.services.candidate_mfa_constants import ASSURANCE_AAL2_RECOVERY, ASSURANCE_AAL2_TOTP
from app.services.step_up_request import session_binding_from_request, step_up_token_from_request

CANARY_TOKEN_TYPE = "founder_canary"
CANARY_SCOPE_READ = "founder_canary:read"
CANARY_SCOPE_WRITE = "founder_canary:write"
_STRONG_ASSURANCE = frozenset({ASSURANCE_AAL2_TOTP, ASSURANCE_AAL2_RECOVERY})


@dataclass(frozen=True)
class FounderCanaryPrincipal:
    user_id: int
    email: str
    session_key: str
    assurance: str
    scopes: frozenset[str]

    @property
    def audit_actor(self) -> str:
        return f"founder_user:{self.user_id}"


def _founder_emails(settings: Settings) -> frozenset[str]:
    return frozenset(
        value.strip().lower()
        for value in re.split(r"[,;\s]+", settings.founder_command_allowlist or "")
        if "@" in value
    )


def _require_founder(settings: Settings, user: User) -> None:
    allowlist = _founder_emails(settings)
    if not allowlist:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="founder_allowlist_missing")
    if not user.is_active or user.email.strip().lower() not in allowlist:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="founder_access_required")


def _managed_session(
    db: Session,
    *,
    user_id: int,
    session_key: str | None,
    epoch: int | None,
) -> CandidateAuthSession:
    row = (
        db.query(CandidateAuthSession)
        .filter(
            CandidateAuthSession.user_id == user_id,
            CandidateAuthSession.session_key == (session_key or ""),
        )
        .one_or_none()
    )
    if row is None or row.state != STATE_ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="managed_session_required")
    if epoch is None or int(row.epoch) != int(epoch):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="managed_session_epoch_mismatch")
    if row.expires_at and row.expires_at < datetime.utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="managed_session_expired")
    return row


def issue_founder_canary_session(
    db: Session,
    settings: Settings,
    request: Request,
    user: User,
) -> dict[str, Any]:
    """Issue a short-lived capability after Founder role plus MFA or one-time step-up."""
    _require_founder(settings, user)
    sid, epoch = session_binding_from_request(request)
    managed = _managed_session(db, user_id=user.id, session_key=sid, epoch=epoch)
    assurance = str(managed.assurance_level or "AAL1_PRIMARY")
    auth_method = "mfa" if assurance in _STRONG_ASSURANCE else "password_step_up"
    if auth_method == "password_step_up":
        step_token = step_up_token_from_request(request)
        if not step_token:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="step_up_required")
        try:
            step_up.consume_step_up(
                db,
                user=user,
                purpose=PURPOSE_FOUNDER_CANARY_ADMIN,
                step_up_token=step_token,
                session_key=sid,
                session_epoch=epoch,
            )
        except ValueError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    ttl = max(5, min(30, int(settings.founder_canary_session_minutes or 15)))
    token = create_access_token_claims(
        {
            "sub": f"founder-canary:{user.id}",
            "uid": user.id,
            MANAGED_CLAIM_TYP: CANARY_TOKEN_TYPE,
            MANAGED_CLAIM_SID: sid,
            MANAGED_CLAIM_EPOCH: epoch,
            "scope": f"{CANARY_SCOPE_READ} {CANARY_SCOPE_WRITE}",
            "auth_method": auth_method,
            "aal": assurance,
        },
        expires_minutes=ttl,
    )
    return {
        "canary_session_token_once": token,
        "expires_in_seconds": ttl * 60,
        "auth_method": auth_method,
        "assurance_level": assurance,
        "principal": {"user_id": user.id},
    }


def _decode_canary_token(raw: str) -> dict[str, Any]:
    claims = decode_access_token_claims(raw)
    if not claims or claims.get(MANAGED_CLAIM_TYP) != CANARY_TOKEN_TYPE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_canary_session")
    return claims


def require_founder_canary_read(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Session = Depends(get_db),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> FounderCanaryPrincipal:
    raw = (authorization or "").strip()
    if not raw.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="canary_session_required")
    claims = _decode_canary_token(raw[7:].strip())
    user_id = int(claims.get("uid") or 0)
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None or claims.get("sub") != f"founder-canary:{user_id}":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_canary_principal")
    _require_founder(settings, user)
    sid = str(claims.get(MANAGED_CLAIM_SID) or "")
    epoch = int(claims.get(MANAGED_CLAIM_EPOCH) or 0)
    managed = _managed_session(db, user_id=user.id, session_key=sid, epoch=epoch)
    scopes = frozenset(str(claims.get("scope") or "").split())
    if CANARY_SCOPE_READ not in scopes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="canary_read_scope_required")
    return FounderCanaryPrincipal(
        user_id=user.id,
        email=user.email,
        session_key=sid,
        assurance=str(managed.assurance_level or "AAL1_PRIMARY"),
        scopes=scopes,
    )


def require_founder_canary_write(
    principal: FounderCanaryPrincipal = Depends(require_founder_canary_read),
) -> FounderCanaryPrincipal:
    if CANARY_SCOPE_WRITE not in principal.scopes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="canary_write_scope_required")
    return principal
