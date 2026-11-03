"""Founder/admin authorization for the private canary control plane.

Browser path: allowlisted Founder user + short-lived elevated session
issued only after verified assurance (TOTP required when MFA enabled;
password step-up only when MFA is not enrolled). Elevated tokens are bound
to the originating managed auth session (sid+epoch) and re-checked on every
use — logout, revoke, deactivate, allowlist removal, and epoch change fail closed.

Machine path: OPS/BETA admin bearer for scripts only — never accepted from
the browser BFF and cannot mint a Founder elevated browser session.

Secrets: production/staging require FOUNDER_CANARY_SESSION_SECRET (no silent
SECRET_KEY broadening). Allowlist: FOUNDER_CANARY_ALLOWLIST if set, else
FOUNDER_COMMAND_ALLOWLIST; empty allowlist fails closed.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from dataclasses import dataclass
from typing import Annotated, Literal

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_db
from app.core.security import decode_access_token, decode_access_token_claims
from app.database.models import CandidateAuthSession, User
from app.services import candidate_auth_session as cas
from app.services import candidate_mfa as mfa
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_CANARY_ADMIN_MUTATE
from app.services.candidate_auth_session_constants import (
    MANAGED_CLAIM_EPOCH,
    MANAGED_CLAIM_SID,
    STATE_ACTIVE,
)
from app.services.step_up_request import session_binding_from_request, step_up_token_from_request

_oauth_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ELEVATED_MAX_AGE_SECONDS = 15 * 60
ELEVATED_HEADER = "X-Twin-Founder-Canary-Elevated"
MFA_CODE_HEADER = "X-Twin-Mfa-Code"
CSRF_HEADER = "X-CSRF-Token"
ELEVATED_VERSION = "v2"


@dataclass(frozen=True)
class FounderCanaryPrincipal:
    """Authenticated principal for canary admin routes."""

    via: Literal["founder_user", "founder_elevated", "ops_machine"]
    email: str | None
    user_id: int | None
    fingerprint: str
    session_key: str | None = None
    session_epoch: int | None = None


def parse_founder_allowlist(raw: str | None) -> set[str]:
    out: set[str] = set()
    for part in (raw or "").split(","):
        for piece in part.replace(";", " ").split():
            email = piece.strip().lower()
            if "@" in email:
                out.add(email)
    return out


def founder_allowlist(settings: Settings) -> set[str]:
    """FOUNDER_CANARY_ALLOWLIST if set (exclusive); else FOUNDER_COMMAND_ALLOWLIST."""
    primary = (getattr(settings, "founder_canary_allowlist", "") or "").strip()
    if primary:
        return parse_founder_allowlist(primary)
    return parse_founder_allowlist(getattr(settings, "founder_command_allowlist", "") or "")


def _ops_token(settings: Settings) -> str:
    return (settings.ops_admin_token or "").strip() or (settings.beta_admin_token or "").strip()


def _fingerprint(material: str) -> str:
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def _access_token_fp(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:24]


def _elevate_secret(settings: Settings) -> str:
    dedicated = (getattr(settings, "founder_canary_session_secret", "") or "").strip()
    if dedicated:
        return dedicated
    env = (settings.environment or "").strip().lower()
    if env in ("production", "staging"):
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FOUNDER_CANARY_SESSION_SECRET required in production/staging",
        )
    # Local/dev only — never broaden silently in prod.
    return (settings.founder_command_csrf_secret or settings.secret_key or "").strip()


def _bearer_raw(authorization: str | None, oauth_token: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    raw = (oauth_token or "").strip()
    return raw or None


def _stash_session_binding(request: Request, raw_token: str) -> None:
    try:
        request.state.access_token = raw_token
        request.state.session_key = cas.session_key_from_token(raw_token)
        claims = decode_access_token_claims(raw_token) or {}
        request.state.session_epoch = (
            int(claims[MANAGED_CLAIM_EPOCH]) if MANAGED_CLAIM_EPOCH in claims else None
        )
    except Exception:
        pass


def _load_user_from_access_token(db: Session, token: str) -> User:
    try:
        email, reason = cas.validate_access_token(db, token)
        if reason or not email:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except HTTPException:
        raise
    except Exception:
        email = decode_access_token(token)
    if not email:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


def _require_allowlisted(user: User, settings: Settings) -> None:
    allow = founder_allowlist(settings)
    if not allow:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary allowlist is not configured",
        )
    if (user.email or "").strip().lower() not in allow:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Forbidden — founder session required",
        )


def _require_managed_session_active(
    db: Session,
    *,
    user_id: int,
    session_key: str,
    session_epoch: int,
) -> None:
    row = (
        db.query(CandidateAuthSession)
        .filter(CandidateAuthSession.session_key == session_key)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session revoked")
    if int(row.user_id) != int(user_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session principal mismatch")
    if row.state != STATE_ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session revoked")
    if row.expires_at is not None:
        from datetime import datetime

        if row.expires_at < datetime.utcnow():
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session revoked")
    if int(row.epoch) != int(session_epoch):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session epoch mismatch")


def issue_elevated_token(
    settings: Settings,
    *,
    user: User,
    session_key: str | None,
    session_epoch: int | None,
    access_token: str,
) -> dict[str, str | int]:
    secret = _elevate_secret(settings)
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary session secret missing",
        )
    nonce = secrets.token_urlsafe(16)
    ts = str(int(time.time()))
    email = (user.email or "").strip().lower()
    sid = (session_key or "").strip() or "-"
    epoch_s = str(int(session_epoch)) if session_epoch is not None else "-"
    at_fp = _access_token_fp(access_token)
    payload = f"{ELEVATED_VERSION}|{user.id}|{email}|{sid}|{epoch_s}|{at_fp}|{ts}|{nonce}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    token = f"{payload}|{sig}"
    csrf_nonce = secrets.token_urlsafe(16)
    csrf_payload = f"csrf:{user.id}:{ts}:{csrf_nonce}"
    csrf_sig = hmac.new(secret.encode(), csrf_payload.encode(), hashlib.sha256).hexdigest()
    return {
        "elevated_token": token,
        "csrf_token": f"{csrf_payload}:{csrf_sig}",
        "expires_in": ELEVATED_MAX_AGE_SECONDS,
        "email": email,
        "bound_session_key": None if sid == "-" else sid,
        "bound_session_epoch": None if epoch_s == "-" else int(epoch_s),
    }


def verify_elevated_token(
    db: Session,
    settings: Settings,
    token: str | None,
    *,
    access_token: str | None = None,
    max_age_seconds: int = ELEVATED_MAX_AGE_SECONDS,
) -> tuple[int, str, str | None, int | None]:
    """Return (user_id, email, session_key, session_epoch). Fail closed on revoke/mismatch."""
    secret = _elevate_secret(settings)
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary session secret missing",
        )
    raw = (token or "").strip()
    parts = raw.split("|")
    if len(parts) != 9 or parts[0] != ELEVATED_VERSION:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid elevated session")
    _ver, user_id_s, email, sid, epoch_s, at_fp, ts_s, nonce, sig = parts
    payload = f"{ELEVATED_VERSION}|{user_id_s}|{email}|{sid}|{epoch_s}|{at_fp}|{ts_s}|{nonce}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid elevated session")
    try:
        ts = int(ts_s)
        user_id = int(user_id_s)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid elevated session") from exc
    if abs(int(time.time()) - ts) > max_age_seconds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session expired")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    current_email = (user.email or "").strip().lower()
    if current_email != email.strip().lower():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Elevated session principal mismatch")
    _require_allowlisted(user, settings)

    session_key: str | None = None if sid == "-" else sid
    session_epoch: int | None = None if epoch_s == "-" else int(epoch_s)
    if session_key is not None:
        if session_epoch is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid elevated session")
        _require_managed_session_active(
            db, user_id=user_id, session_key=session_key, session_epoch=session_epoch
        )

    if access_token:
        # Continuing validity of the originating access token (logout / rotate / replace).
        try:
            live_user = _load_user_from_access_token(db, access_token)
        except HTTPException as exc:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="Elevated session revoked"
            ) from exc
        if int(live_user.id) != user_id:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="Elevated session principal mismatch"
            )
        if _access_token_fp(access_token) != at_fp:
            # Token rotated/replaced — privilege does not transfer.
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="Elevated session revoked"
            )
        live_sid = cas.session_key_from_token(access_token)
        claims = decode_access_token_claims(access_token) or {}
        live_epoch = int(claims[MANAGED_CLAIM_EPOCH]) if MANAGED_CLAIM_EPOCH in claims else None
        if session_key and (live_sid != session_key or live_epoch != session_epoch):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="Elevated session epoch mismatch"
            )

    return user_id, current_email, session_key, session_epoch


def verify_elevated_csrf(
    settings: Settings,
    *,
    user_id: int,
    csrf_token: str | None,
    max_age_seconds: int = ELEVATED_MAX_AGE_SECONDS,
) -> None:
    secret = _elevate_secret(settings)
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary session secret missing",
        )
    raw = (csrf_token or "").strip()
    parts = raw.split(":")
    if len(parts) != 5 or parts[0] != "csrf":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    _, uid_s, ts_s, nonce, sig = parts
    try:
        uid = int(uid_s)
        ts = int(ts_s)
    except ValueError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token") from exc
    if uid != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF principal mismatch")
    if abs(int(time.time()) - ts) > max_age_seconds:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF token expired")
    payload = f"csrf:{uid_s}:{ts_s}:{nonce}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="CSRF signature invalid")


def _consume_assurance(
    db: Session,
    request: Request,
    user: User,
    *,
    step_up_token: str | None,
    mfa_code: str | None,
) -> None:
    """Founder sensitive assurance.

    When MFA is enabled: TOTP is mandatory (password step-up alone is insufficient).
    When MFA is not enrolled: password step-up with CANARY_ADMIN_MUTATE is required
    (bootstrap exception until Founder enrolls MFA — deliberate, documented).
    """
    sid, epoch = session_binding_from_request(request)
    token = (step_up_token or step_up_token_from_request(request) or "").strip() or None
    code = (mfa_code or "").strip() or None
    mfa_on = bool(mfa.user_mfa_enabled(db, user_id=user.id))

    if mfa_on:
        if not code:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="mfa_required")
        try:
            mfa.verify_totp_for_sensitive_action(db, user=user, code=code)
        except ValueError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
        return

    if not token:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="step_up_required")
    try:
        step_up.require_step_up_or_raise(
            db,
            user=user,
            purpose=PURPOSE_CANARY_ADMIN_MUTATE,
            step_up_token=token,
            session_key=sid,
            session_epoch=epoch,
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


def resolve_founder_canary_read(
    db: Session,
    settings: Settings,
    request: Request,
    *,
    authorization: str | None,
    oauth_token: str | None,
    elevated_header: str | None,
) -> FounderCanaryPrincipal:
    ops = _ops_token(settings)
    raw = _bearer_raw(authorization, oauth_token)

    if ops and raw and hmac.compare_digest(raw, ops):
        return FounderCanaryPrincipal(
            via="ops_machine",
            email=None,
            user_id=None,
            fingerprint=_fingerprint(ops),
        )

    if elevated_header:
        user_id, email, sid, epoch = verify_elevated_token(
            db, settings, elevated_header, access_token=raw
        )
        return FounderCanaryPrincipal(
            via="founder_elevated",
            email=email,
            user_id=user_id,
            fingerprint=_fingerprint(f"elevated:{user_id}:{email}:{sid}:{epoch}"),
            session_key=sid,
            session_epoch=epoch,
        )

    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user = _load_user_from_access_token(db, raw)
    _require_allowlisted(user, settings)
    _stash_session_binding(request, raw)
    return FounderCanaryPrincipal(
        via="founder_user",
        email=(user.email or "").strip().lower(),
        user_id=user.id,
        fingerprint=_fingerprint(f"user:{user.id}:{user.email}"),
        session_key=getattr(request.state, "session_key", None),
        session_epoch=getattr(request.state, "session_epoch", None),
    )


def resolve_founder_canary_mutate(
    db: Session,
    settings: Settings,
    request: Request,
    *,
    authorization: str | None,
    oauth_token: str | None,
    elevated_header: str | None,
    csrf_token: str | None,
    step_up_token: str | None,
    mfa_code: str | None,
) -> FounderCanaryPrincipal:
    principal = resolve_founder_canary_read(
        db,
        settings,
        request,
        authorization=authorization,
        oauth_token=oauth_token,
        elevated_header=elevated_header,
    )
    if principal.via == "ops_machine":
        return principal

    if principal.via == "founder_elevated":
        assert principal.user_id is not None
        # Elevated path must present continuing access token (BFF cookie) for binding.
        raw = _bearer_raw(authorization, oauth_token)
        if not raw:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail="Elevated session requires bound access token",
            )
        # Re-verify with access token binding (also catches replay after logout).
        verify_elevated_token(db, settings, elevated_header, access_token=raw)
        verify_elevated_csrf(settings, user_id=principal.user_id, csrf_token=csrf_token)
        return principal

    assert principal.user_id is not None
    user = db.get(User, principal.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    _consume_assurance(
        db,
        request,
        user,
        step_up_token=step_up_token,
        mfa_code=mfa_code,
    )
    return principal


def elevate_founder_canary(
    db: Session,
    settings: Settings,
    request: Request,
    *,
    authorization: str | None,
    oauth_token: str | None,
    step_up_token: str | None,
    mfa_code: str | None,
) -> dict[str, str | int | bool | None]:
    raw = _bearer_raw(authorization, oauth_token)
    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    ops = _ops_token(settings)
    if ops and hmac.compare_digest(raw, ops):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Machine ops token cannot elevate a Founder browser session",
        )
    user = _load_user_from_access_token(db, raw)
    _require_allowlisted(user, settings)
    _stash_session_binding(request, raw)
    _consume_assurance(
        db,
        request,
        user,
        step_up_token=step_up_token,
        mfa_code=mfa_code,
    )
    sid = getattr(request.state, "session_key", None) or cas.session_key_from_token(raw)
    claims = decode_access_token_claims(raw) or {}
    epoch = int(claims[MANAGED_CLAIM_EPOCH]) if MANAGED_CLAIM_EPOCH in claims else None
    # Prefer managed sessions — bind sid+epoch when present; else bind access-token fingerprint only.
    if sid and epoch is not None:
        _require_managed_session_active(
            db, user_id=user.id, session_key=sid, session_epoch=epoch
        )
    else:
        sid = None
        epoch = None
    issued = issue_elevated_token(
        settings,
        user=user,
        session_key=sid,
        session_epoch=epoch,
        access_token=raw,
    )
    mfa_on = bool(mfa.user_mfa_enabled(db, user_id=user.id))
    return {
        **issued,
        "via": "founder_elevated",
        "mfa_enabled": mfa_on,
        "assurance": "aal2_totp" if mfa_on else "step_up_password",
        "mfa_required_when_enrolled": True,
        "password_step_up_insufficient_when_mfa_enabled": True,
    }


def require_founder_canary_read(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    oauth_token: Annotated[str | None, Depends(_oauth_optional)] = None,
    elevated: Annotated[str | None, Header(alias=ELEVATED_HEADER)] = None,
) -> FounderCanaryPrincipal:
    return resolve_founder_canary_read(
        db,
        settings,
        request,
        authorization=authorization,
        oauth_token=oauth_token,
        elevated_header=elevated,
    )


def require_founder_canary_mutate(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
    oauth_token: Annotated[str | None, Depends(_oauth_optional)] = None,
    elevated: Annotated[str | None, Header(alias=ELEVATED_HEADER)] = None,
    csrf_token: Annotated[str | None, Header(alias=CSRF_HEADER)] = None,
    step_up_hdr: Annotated[str | None, Header(alias="X-Twin-Step-Up")] = None,
    mfa_code: Annotated[str | None, Header(alias=MFA_CODE_HEADER)] = None,
) -> FounderCanaryPrincipal:
    return resolve_founder_canary_mutate(
        db,
        settings,
        request,
        authorization=authorization,
        oauth_token=oauth_token,
        elevated_header=elevated,
        csrf_token=csrf_token,
        step_up_token=step_up_hdr,
        mfa_code=mfa_code,
    )


def actor_label(principal: FounderCanaryPrincipal) -> str:
    if principal.via == "ops_machine":
        return "ops_machine"
    email = (principal.email or "founder").split("@", 1)[0][:32]
    return f"founder:{email}"
