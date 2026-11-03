"""Founder/admin authorization for the private canary control plane.

Browser path: allowlisted Founder user + short-lived elevated session
(issued only after verified step-up or TOTP). Machine path: OPS/BETA admin
bearer for scripts — never accepted from the browser BFF.

Fail-closed when the Founder allowlist is empty on the user path.
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
from app.core.security import decode_access_token
from app.database.models import User
from app.services import candidate_auth_session as cas
from app.services import candidate_mfa as mfa
from app.services import candidate_step_up as step_up
from app.services.candidate_account_recovery_constants import PURPOSE_CANARY_ADMIN_MUTATE
from app.services.step_up_request import session_binding_from_request, step_up_token_from_request

_oauth_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

ELEVATED_MAX_AGE_SECONDS = 15 * 60
ELEVATED_HEADER = "X-Twin-Founder-Canary-Elevated"
MFA_CODE_HEADER = "X-Twin-Mfa-Code"
CSRF_HEADER = "X-CSRF-Token"


@dataclass(frozen=True)
class FounderCanaryPrincipal:
    """Authenticated principal for canary admin routes."""

    via: Literal["founder_user", "founder_elevated", "ops_machine"]
    email: str | None
    user_id: int | None
    fingerprint: str


def parse_founder_allowlist(raw: str | None) -> set[str]:
    out: set[str] = set()
    for part in (raw or "").split(","):
        for piece in part.replace(";", " ").split():
            email = piece.strip().lower()
            if "@" in email:
                out.add(email)
    return out


def founder_allowlist(settings: Settings) -> set[str]:
    """FOUNDER_CANARY_ALLOWLIST, else FOUNDER_COMMAND_ALLOWLIST (shared Founder roster)."""
    primary = (getattr(settings, "founder_canary_allowlist", "") or "").strip()
    if primary:
        return parse_founder_allowlist(primary)
    return parse_founder_allowlist(getattr(settings, "founder_command_allowlist", "") or "")


def _ops_token(settings: Settings) -> str:
    return (settings.ops_admin_token or "").strip() or (settings.beta_admin_token or "").strip()


def _fingerprint(material: str) -> str:
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def _elevate_secret(settings: Settings) -> str:
    return (
        (getattr(settings, "founder_canary_session_secret", "") or "").strip()
        or (settings.founder_command_csrf_secret or "").strip()
        or (settings.secret_key or "").strip()
    )


def _bearer_raw(authorization: str | None, oauth_token: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            return token
    raw = (oauth_token or "").strip()
    return raw or None


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


def issue_elevated_token(settings: Settings, *, user: User) -> dict[str, str | int]:
    secret = _elevate_secret(settings)
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary session secret missing",
        )
    nonce = secrets.token_urlsafe(16)
    ts = str(int(time.time()))
    email = (user.email or "").strip().lower()
    payload = f"{user.id}:{email}:{ts}:{nonce}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    token = f"{payload}:{sig}"
    csrf_nonce = secrets.token_urlsafe(16)
    csrf_payload = f"csrf:{user.id}:{ts}:{csrf_nonce}"
    csrf_sig = hmac.new(secret.encode(), csrf_payload.encode(), hashlib.sha256).hexdigest()
    return {
        "elevated_token": token,
        "csrf_token": f"{csrf_payload}:{csrf_sig}",
        "expires_in": ELEVATED_MAX_AGE_SECONDS,
        "email": email,
    }


def verify_elevated_token(
    settings: Settings,
    token: str | None,
    *,
    max_age_seconds: int = ELEVATED_MAX_AGE_SECONDS,
) -> tuple[int, str]:
    secret = _elevate_secret(settings)
    if not secret:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Founder canary session secret missing",
        )
    raw = (token or "").strip()
    parts = raw.split(":")
    if len(parts) != 5:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid elevated session")
    user_id_s, email, ts_s, nonce, sig = parts
    payload = f"{user_id_s}:{email}:{ts_s}:{nonce}"
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
    allow = founder_allowlist(settings)
    if not allow or email.strip().lower() not in allow:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden — founder session required")
    return user_id, email.strip().lower()


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
    """Require verified step-up or TOTP for Founder canary elevation / sensitive change."""
    sid, epoch = session_binding_from_request(request)
    token = (step_up_token or step_up_token_from_request(request) or "").strip() or None
    code = (mfa_code or "").strip() or None

    if token:
        try:
            step_up.require_step_up_or_raise(
                db,
                user=user,
                purpose=PURPOSE_CANARY_ADMIN_MUTATE,
                step_up_token=token,
                session_key=sid,
                session_epoch=epoch,
            )
            return
        except ValueError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    if code:
        if not mfa.user_mfa_enabled(db, user_id=user.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="mfa_not_enabled")
        try:
            mfa.verify_totp_for_sensitive_action(db, user=user, code=code)
            return
        except ValueError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    if mfa.user_mfa_enabled(db, user_id=user.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="mfa_or_step_up_required")
    raise HTTPException(status.HTTP_403_FORBIDDEN, detail="step_up_required")


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
        user_id, email = verify_elevated_token(settings, elevated_header)
        return FounderCanaryPrincipal(
            via="founder_elevated",
            email=email,
            user_id=user_id,
            fingerprint=_fingerprint(f"elevated:{user_id}:{email}"),
        )

    if not raw:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user = _load_user_from_access_token(db, raw)
    _require_allowlisted(user, settings)
    # Stash session binding for step-up on subsequent elevate/mutate.
    try:
        request.state.access_token = raw
        request.state.session_key = cas.session_key_from_token(raw)
        from app.core.security import decode_access_token_claims
        from app.services.candidate_auth_session_constants import MANAGED_CLAIM_EPOCH

        claims = decode_access_token_claims(raw) or {}
        request.state.session_epoch = (
            int(claims[MANAGED_CLAIM_EPOCH]) if MANAGED_CLAIM_EPOCH in claims else None
        )
    except Exception:
        pass
    return FounderCanaryPrincipal(
        via="founder_user",
        email=(user.email or "").strip().lower(),
        user_id=user.id,
        fingerprint=_fingerprint(f"user:{user.id}:{user.email}"),
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
        verify_elevated_csrf(settings, user_id=principal.user_id, csrf_token=csrf_token)
        return principal

    # Fresh user JWT path — require step-up/MFA for every sensitive mutation.
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
) -> dict[str, str | int]:
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
    try:
        request.state.access_token = raw
        request.state.session_key = cas.session_key_from_token(raw)
        from app.core.security import decode_access_token_claims
        from app.services.candidate_auth_session_constants import MANAGED_CLAIM_EPOCH

        claims = decode_access_token_claims(raw) or {}
        request.state.session_epoch = (
            int(claims[MANAGED_CLAIM_EPOCH]) if MANAGED_CLAIM_EPOCH in claims else None
        )
    except Exception:
        pass
    _consume_assurance(
        db,
        request,
        user,
        step_up_token=step_up_token,
        mfa_code=mfa_code,
    )
    issued = issue_elevated_token(settings, user=user)
    return {
        **issued,
        "via": "founder_elevated",
        "mfa_enabled": bool(mfa.user_mfa_enabled(db, user_id=user.id)),
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
