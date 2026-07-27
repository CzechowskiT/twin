"""Registration and login."""

from datetime import datetime, timezone
from enum import Enum
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from slowapi.util import get_remote_address

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.recruiter_jwt import mint_recruiter_session_jwt
from app.core.scrape_ops import (
    scrape_ops_configured,
    scrape_worker_ready,
    user_can_trigger_scrape,
    user_has_scrape_ops,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.database.models import User
from app.database.session import get_db
from app.limiter import limiter
from app.schemas.auth import (
    BillingProfileIn,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GdprConsentIn,
    NotificationPreferencesIn,
    OnboardingProgressIn,
    ResetPasswordRequest,
    VerifyEmailRequest,
    Token,
    UserLogin,
    UserMarketingPreference,
    UserOut,
    UserRegister,
    UserRegisteredOut,
)
from app.schemas.recruiter_session import RecruiterSessionExchangeIn, RecruiterSessionOut
from app.services.apple_oauth import (
    AppleOAuthError,
    build_apple_authorize_url,
    exchange_apple_code_for_profile,
    is_apple_configured,
)
from app.services.github_oauth import (
    GitHubOAuthError,
    build_github_authorize_url,
    exchange_github_code_for_profile,
    is_github_configured,
)
from app.services.google_oauth import (
    GoogleOAuthError,
    build_google_authorize_url,
    exchange_google_code_for_profile,
    is_google_configured,
)
from app.services.linkedin_auth import user_from_linkedin
from app.services.linkedin_oauth import (
    LinkedInOAuthError,
    build_authorize_url,
    exchange_code_for_profile,
    is_linkedin_oauth_configured,
)
from app.services.linkedin_profile_sync import (
    ensure_candidate_from_linkedin,
    ensure_candidate_from_oauth_profile,
)
from app.services.login_rate_limit import enforce_login_rate_limit_per_minute
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured
from app.services.mail import is_mail_configured
from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured
from app.services.microsoft_oauth import (
    MicrosoftOAuthError,
    build_microsoft_authorize_url,
    exchange_microsoft_code_for_profile,
    is_microsoft_configured,
)
from app.services.oauth_state import create_oauth_state, verify_oauth_state
from app.services.oauth_types import OAuthUserProfile
from app.services.oauth_user import user_from_oauth
from app.services.email_verification import (
    issue_verification_email,
    resend_verification,
    verify_email_with_token,
)
from app.services.password_change import PasswordChangeError, change_user_password
from app.services.password_reset import request_password_reset, reset_password_with_token
from app.services.referral_public_token import ensure_user_referral_public_token
from app.services.recruiter_company_auth import resolve_recruiter_access
from app.services.signup_referrer import (
    normalize_stored_referred_by_note,
    normalize_utm_field,
    resolve_combined_signup_referrer_user_id,
)

router = APIRouter()


def _core_consents_complete(user: User) -> bool:
    """Privacy + ToS + job-data + AI matching — required for product use (password login + route guard)."""
    return bool(
        user.gdpr_consent_at
        and user.terms_of_service_accepted_at
        and user.job_data_processing_consent_at
        and user.ai_matching_consent_at
    )


class WebOAuthProvider(str, Enum):
    google = "google"
    github = "github"
    apple = "apple"
    microsoft = "microsoft"


def _frontend_callback_url(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/auth/callback?{query}" if query else f"{base}/auth/callback"


def _frontend_login_url(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/login?{query}" if query else f"{base}/login"


def _frontend_oauth_error_url(error: str) -> str:
    """Misconfigured OAuth: candidate login shows the error instead of the role hub."""
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/login/candidate?{urlencode({'error': error})}"


def _web_oauth_configured(provider: WebOAuthProvider) -> bool:
    if provider == WebOAuthProvider.google:
        return is_google_configured()
    if provider == WebOAuthProvider.github:
        return is_github_configured()
    if provider == WebOAuthProvider.apple:
        return is_apple_configured()
    if provider == WebOAuthProvider.microsoft:
        return is_microsoft_configured()
    return False


def _web_oauth_authorize_url(provider: WebOAuthProvider, state: str) -> str:
    if provider == WebOAuthProvider.google:
        return build_google_authorize_url(state)
    if provider == WebOAuthProvider.github:
        return build_github_authorize_url(state)
    if provider == WebOAuthProvider.apple:
        return build_apple_authorize_url(state)
    if provider == WebOAuthProvider.microsoft:
        return build_microsoft_authorize_url(state)
    raise AssertionError("unsupported web OAuth provider")


def _web_oauth_exchange_profile(
    provider: WebOAuthProvider, code: str, apple_user: str | None
) -> OAuthUserProfile:
    if provider == WebOAuthProvider.google:
        return exchange_google_code_for_profile(code)
    if provider == WebOAuthProvider.github:
        return exchange_github_code_for_profile(code)
    if provider == WebOAuthProvider.apple:
        return exchange_apple_code_for_profile(code, apple_user)
    if provider == WebOAuthProvider.microsoft:
        return exchange_microsoft_code_for_profile(code)
    raise AssertionError("unsupported web OAuth provider")


async def _read_web_oauth_callback(
    request: Request,
) -> tuple[str | None, str | None, str | None, str | None]:
    if request.method == "GET":
        qp = request.query_params
        return qp.get("code"), qp.get("state"), qp.get("error"), None
    form = await request.form()
    code = form.get("code")
    state = form.get("state")
    err = form.get("error")
    user_field = form.get("user")
    return (
        str(code) if code else None,
        str(state) if state else None,
        str(err) if err else None,
        str(user_field) if user_field else None,
    )


@router.post("/register", response_model=UserRegisteredOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, body: UserRegister, db: Session = Depends(get_db)) -> UserRegisteredOut:
    if not (
        body.gdpr_consent
        and body.terms_of_service_consent
        and body.job_data_processing_consent
        and body.ai_matching_consent
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All required consents must be accepted (privacy, terms, job data, AI matching)",
        )
    settings = get_settings()
    invite_token_to_consume: str | None = None
    if not settings.external_pilot_enrollment_enabled and settings.pilot_registration_invite_only:
        allow = {
            e.strip().lower()
            for e in (settings.pilot_email_allowlist or "").split(",")
            if e.strip()
        }
        email_l = str(body.email).strip().lower()
        bridge_ok = False
        if email_l not in allow:
            try:
                from app.services import candidate_invite_tokens as invite_tokens

                bridge_ok = invite_tokens.email_allowed_for_register(
                    db, email=email_l, invite_token=body.invite_token
                )
            except Exception:  # noqa: BLE001
                bridge_ok = False
        if email_l not in allow and not bridge_ok:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="registration_invite_only",
            )
        if body.invite_token and bridge_ok and email_l not in allow:
            invite_token_to_consume = body.invite_token.strip()
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    stored_ref_note = normalize_stored_referred_by_note(body.referred_by_note)
    referrer_id = resolve_combined_signup_referrer_user_id(
        db,
        stored_note=stored_ref_note,
        new_user_email=str(body.email),
        ref=body.ref,
        utm_content=body.utm_content,
    )
    tok_match = normalize_utm_field(body.ref) or normalize_utm_field(body.utm_content)
    ref_snapshot = None
    if referrer_id and tok_match:
        from app.services.signup_referrer import resolve_signup_referrer_from_utm_content

        if (
            resolve_signup_referrer_from_utm_content(
                db, utm_content=tok_match, new_user_email=str(body.email)
            )
            == referrer_id
        ):
            ref_snapshot = tok_match
    now = datetime.now(timezone.utc)
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        gdpr_consent_at=now,
        terms_of_service_accepted_at=now,
        job_data_processing_consent_at=now,
        ai_matching_consent_at=now,
        marketing_emails_opt_in=body.marketing_emails_opt_in,
        marketing_emails_opt_in_at=(now if body.marketing_emails_opt_in else None),
        signup_referred_by_note=stored_ref_note,
        signup_referrer_user_id=referrer_id,
        signup_utm_source=normalize_utm_field(body.utm_source),
        signup_utm_medium=normalize_utm_field(body.utm_medium),
        signup_utm_campaign=normalize_utm_field(body.utm_campaign),
        signup_utm_content=normalize_utm_field(body.utm_content) or normalize_utm_field(body.ref),
    )
    try:
        from app.services.metrics_exclusion import apply_metrics_exclusion_to_user

        apply_metrics_exclusion_to_user(user)
    except Exception:
        pass
    db.add(user)
    db.flush()
    ensure_user_referral_public_token(db, user)
    if referrer_id:
        from app.services import referral_program as rp
        from app.services.candidate_referral_persistence import attach_signup_to_candidate_referral

        rp.record_account_referral_edge(
            db,
            referrer_user_id=referrer_id,
            referred_user_id=user.id,
            ref_code_used=ref_snapshot,
            utm_source=user.signup_utm_source,
            utm_medium=user.signup_utm_medium,
            utm_campaign=user.signup_utm_campaign,
            utm_content=user.signup_utm_content,
        )
        attach_signup_to_candidate_referral(
            db,
            referrer_user_id=referrer_id,
            referred_user_id=user.id,
            ref_code_used=ref_snapshot or tok_match,
        )
    db.commit()
    db.refresh(user)
    if invite_token_to_consume:
        try:
            from app.services import candidate_invite_tokens as invite_tokens

            invite_tokens.validate_invite_token(
                db,
                email=str(body.email).strip().lower(),
                raw_token=invite_token_to_consume,
                consume=True,
            )
        except Exception:  # noqa: BLE001
            pass
    try:
        from app.services.product_funnel import emit_funnel_event

        emit_funnel_event(
            db,
            event_name="signup_completed",
            user_id=user.id,
            properties={"source": "register"},
            commit=True,
        )
    except Exception:
        pass
    try:
        from app.tasks.notification_tasks import send_welcome_email_task

        send_welcome_email_task.delay(user.id)
    except Exception:
        pass
    try:
        issue_verification_email(db, get_settings(), user)
    except Exception:
        pass
    token = create_access_token(user.email)
    out = UserOut.from_user(user)
    return UserRegisteredOut(**out.model_dump(), access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    return _authenticate(form.username, form.password, db)


@router.post("/login/json", response_model=Token)
@limiter.limit("5/minute")
def login_json(request: Request, body: UserLogin, db: Session = Depends(get_db)) -> Token:
    return _authenticate(body.email, body.password, db)


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    settings = get_settings()
    enforce_login_rate_limit_per_minute(
        client_key=f"forgot:{get_remote_address(request)}",
        max_per_minute=settings.auth_forgot_password_rate_limit_per_minute,
    )
    message = request_password_reset(db, settings, str(body.email))
    return {"message": message}


@router.post("/verify-email")
@limiter.limit("10/minute")
def verify_email(request: Request, body: VerifyEmailRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """Confirm email with token from message (same shape as reset-password token field)."""
    if not verify_email_with_token(db, body.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )
    return {"message": "Email verified. You can use all TWIN features."}


@router.post("/verify-email/resend")
@limiter.limit("3/minute")
def verify_email_resend(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    settings = get_settings()
    return {"message": resend_verification(db, settings, user)}


@router.post("/reset-password")
@limiter.limit("3/minute")
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not reset_password_with_token(db, body.token, body.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )
    return {"message": "Password updated. You can log in with your new password."}


def _authenticate(email: str, password: str, db: Session) -> Token:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Migration 011 copies gdpr_consent_at into extended fields; if that migration never ran (or
    # partially failed), users would be locked out with 403 despite having accepted privacy before.
    base = user.gdpr_consent_at
    if base and (
        user.terms_of_service_accepted_at is None
        or user.job_data_processing_consent_at is None
        or user.ai_matching_consent_at is None
    ):
        if user.terms_of_service_accepted_at is None:
            user.terms_of_service_accepted_at = base
        if user.job_data_processing_consent_at is None:
            user.job_data_processing_consent_at = base
        if user.ai_matching_consent_at is None:
            user.ai_matching_consent_at = base
        db.add(user)
        db.commit()
        db.refresh(user)
    if not _core_consents_complete(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privacy and consent setup incomplete — finish the consent flow in the app.",
        )
    try:
        from app.services.metrics_exclusion import apply_metrics_exclusion_to_user

        if apply_metrics_exclusion_to_user(user, db=db, commit=True):
            pass
    except Exception:
        pass
    token = create_access_token(user.email)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserOut:
    ensure_user_referral_public_token(db, user)
    db.commit()
    db.refresh(user)
    settings = get_settings()
    base = UserOut.from_user(user)
    return base.model_copy(
        update={
            "scrape_ops_configured": scrape_ops_configured(settings),
            "can_trigger_scrape": user_can_trigger_scrape(user, settings),
            "scrape_ops_elevated": user_has_scrape_ops(user, settings),
            "scrape_worker_ready": scrape_worker_ready(settings),
            "mail_configured": is_mail_configured(settings),
            "google_calendar_oauth_configured": is_google_calendar_oauth_configured(),
            "microsoft_calendar_oauth_configured": is_microsoft_calendar_oauth_configured(),
        }
    )


@router.post("/gdpr-consent", response_model=UserOut)
@limiter.limit("30/minute")
def record_gdpr_consent(
    request: Request,
    body: GdprConsentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    if not (
        body.accept_privacy_policy
        and body.accept_terms_of_service
        and body.accept_job_data_processing
        and body.accept_ai_matching
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All required consents must be accepted",
        )
    now = datetime.now(timezone.utc)
    user.gdpr_consent_at = now
    user.terms_of_service_accepted_at = now
    user.job_data_processing_consent_at = now
    user.ai_matching_consent_at = now
    if body.marketing_emails_opt_in is not None:
        user.marketing_emails_opt_in = bool(body.marketing_emails_opt_in)
        user.marketing_emails_opt_in_at = now if body.marketing_emails_opt_in else None
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_user(user)


@router.patch("/me/marketing", response_model=UserOut)
@limiter.limit("30/minute")
def update_marketing_preference(
    request: Request,
    body: UserMarketingPreference,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    user.marketing_emails_opt_in = body.marketing_emails_opt_in
    user.marketing_emails_opt_in_at = (
        datetime.now(timezone.utc) if body.marketing_emails_opt_in else None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_user(user)


@router.patch("/me/notification-preferences", response_model=UserOut)
@limiter.limit("30/minute")
def update_notification_preferences(
    request: Request,
    body: NotificationPreferencesIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide at least one preference field to update",
        )
    if "email_product_updates" in data:
        user.email_product_updates = bool(data["email_product_updates"])
    if "email_interview_reminders" in data:
        user.email_interview_reminders = bool(data["email_interview_reminders"])
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_user(user)


@router.patch("/me/password")
@limiter.limit("10/minute")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    try:
        change_user_password(
            db,
            user,
            current_password=body.current_password,
            new_password=body.new_password,
        )
    except PasswordChangeError as exc:
        detail = {
            "no_password_login": (
                "This account uses social sign-in only. Continue with your provider "
                "or contact support if you need email-and-password access."
            ),
            "invalid_current_password": "Current password is incorrect.",
            "same_password": "New password must be different from the current password.",
        }.get(exc.code, "Could not update password.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail) from exc
    return {"message": "Password updated."}


@router.patch("/me/billing-profile", response_model=UserOut)
@limiter.limit("30/minute")
def update_billing_profile(
    request: Request,
    body: BillingProfileIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    if body.billing_company_name is not None:
        v = body.billing_company_name.strip()
        user.billing_company_name = v or None
    if body.billing_tax_id is not None:
        v = body.billing_tax_id.strip()
        user.billing_tax_id = v or None
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_user(user)


@router.post("/onboarding/complete", response_model=UserOut)
@limiter.limit("30/minute")
def complete_onboarding(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    first_completion = user.onboarding_completed_at is None
    if first_completion:
        user.onboarding_completed_at = datetime.now(timezone.utc)
        user.onboarding_step = "complete"
        db.add(user)
        db.commit()
        db.refresh(user)
        try:
            from app.services.product_funnel import emit_funnel_event

            emit_funnel_event(
                db,
                event_name="onboarding_completed",
                user_id=user.id,
                properties={"source": "api"},
                commit=True,
            )
        except Exception:
            pass
        try:
            from app.services.activation_matching import maybe_dispatch_after_onboarding

            maybe_dispatch_after_onboarding(db, user, trigger="onboarding_complete")
        except Exception:
            # Activation must never break onboarding completion
            pass
    return UserOut.from_user(user)


@router.put("/onboarding/progress", response_model=UserOut)
@limiter.limit("60/minute")
def save_onboarding_progress(
    request: Request,
    body: OnboardingProgressIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserOut:
    """Persist onboarding step server-side so progress survives device/browser loss."""
    import json

    user.onboarding_step = body.step.strip()[:64]
    if body.progress is not None:
        user.onboarding_progress_json = json.dumps(body.progress)[:4000]
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.from_user(user)


@router.get("/onboarding/progress")
@limiter.limit("60/minute")
def get_onboarding_progress(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    import json

    _ = db
    progress = None
    raw = getattr(user, "onboarding_progress_json", None)
    if raw:
        try:
            progress = json.loads(raw)
        except json.JSONDecodeError:
            progress = None
    return {
        "step": getattr(user, "onboarding_step", None),
        "progress": progress,
        "onboarding_completed_at": (
            user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None
        ),
    }


@router.get("/linkedin/login")
def linkedin_login() -> RedirectResponse:
    if not is_linkedin_oauth_configured():
        return RedirectResponse(
            _frontend_oauth_error_url("linkedin_not_configured"),
            status_code=302,
        )
    state = create_oauth_state()
    return RedirectResponse(build_authorize_url(state), status_code=302)


@router.get("/linkedin/callback")
@limiter.limit("10/minute")
def linkedin_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if error:
        return RedirectResponse(_frontend_callback_url(error="linkedin_denied"))

    if not code or not state or not verify_oauth_state(state):
        return RedirectResponse(_frontend_callback_url(error="invalid_state"))

    try:
        profile = exchange_code_for_profile(code)
        user = user_from_linkedin(db, profile)
        profile_created = ensure_candidate_from_linkedin(db, user, profile)
    except LinkedInOAuthError:
        return RedirectResponse(_frontend_callback_url(error="linkedin_failed"))

    if not user.is_active:
        return RedirectResponse(_frontend_callback_url(error="inactive"))

    token = create_access_token(user.email)
    params: dict[str, str] = {"token": token}
    if profile_created:
        params["next"] = "/profile"
        params["linkedin"] = "1"
    return RedirectResponse(_frontend_callback_url(**params))


@router.get("/{provider}/login")
def web_oauth_login(provider: WebOAuthProvider) -> RedirectResponse:
    slug = provider.value
    if not _web_oauth_configured(provider):
        return RedirectResponse(_frontend_oauth_error_url(f"{slug}_not_configured"), status_code=302)
    state = create_oauth_state()
    try:
        url = _web_oauth_authorize_url(provider, state)
    except (GoogleOAuthError, GitHubOAuthError, AppleOAuthError, MicrosoftOAuthError):
        return RedirectResponse(_frontend_oauth_error_url(f"{slug}_not_configured"), status_code=302)
    return RedirectResponse(url, status_code=302)


@router.api_route("/{provider}/callback", methods=["GET", "POST"])
@limiter.limit("10/minute")
async def web_oauth_callback(
    request: Request,
    provider: WebOAuthProvider,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    slug = provider.value
    code, state, error, apple_user = await _read_web_oauth_callback(request)

    if error:
        return RedirectResponse(_frontend_callback_url(error=f"{slug}_denied"), status_code=302)

    if not code or not state or not verify_oauth_state(state):
        return RedirectResponse(_frontend_callback_url(error="invalid_state"), status_code=302)

    try:
        profile = _web_oauth_exchange_profile(provider, code, apple_user)
        user = user_from_oauth(db, profile)
        profile_created = ensure_candidate_from_oauth_profile(db, user, profile.email, profile.name)
    except (GoogleOAuthError, GitHubOAuthError, AppleOAuthError, MicrosoftOAuthError):
        return RedirectResponse(_frontend_callback_url(error=f"{slug}_failed"), status_code=302)

    if not user.is_active:
        return RedirectResponse(_frontend_callback_url(error="inactive"), status_code=302)

    token = create_access_token(user.email)
    params: dict[str, str] = {"token": token}
    if profile_created:
        params["next"] = "/profile"
        params["oauth"] = "1"
    return RedirectResponse(_frontend_callback_url(**params), status_code=302)


@router.post("/recruiter/session", response_model=RecruiterSessionOut)
@limiter.limit("30/minute")
def exchange_recruiter_session(
    request: Request,
    body: RecruiterSessionExchangeIn,
    db: Session = Depends(get_db),
) -> RecruiterSessionOut:
    """Exchange pilot access token for a short-lived recruiter session JWT (no query-string tokens)."""
    settings = get_settings()
    ok, slug = resolve_recruiter_access(db, settings, body.access_token, body.company_slug)
    if not ok or not slug:
        if not (settings.recruiter_inbox_token or "").strip():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="recruiter_inbox_unavailable",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="recruiter_inbox_invalid_token",
        )
    ttl = settings.recruiter_jwt_expire_minutes
    jwt_token = mint_recruiter_session_jwt(slug, expires_minutes=ttl)
    return RecruiterSessionOut(
        access_token=jwt_token,
        company_slug=slug,
        expires_in_minutes=ttl,
    )