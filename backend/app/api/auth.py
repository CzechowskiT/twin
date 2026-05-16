"""Registration and login."""

from datetime import datetime, timezone
from enum import Enum
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database.models import User
from app.database.session import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserLogin,
    UserOut,
    UserRegister,
)
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
from app.services.oauth_state import create_oauth_state, verify_oauth_state
from app.services.oauth_types import OAuthUserProfile
from app.services.oauth_user import user_from_oauth
from app.services.password_reset import request_password_reset, reset_password_with_token

router = APIRouter()


class WebOAuthProvider(str, Enum):
    google = "google"
    github = "github"
    apple = "apple"


def _frontend_callback_url(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/auth/callback?{query}" if query else f"{base}/auth/callback"


def _frontend_login_url(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/login?{query}" if query else f"{base}/login"


def _web_oauth_configured(provider: WebOAuthProvider) -> bool:
    if provider == WebOAuthProvider.google:
        return is_google_configured()
    if provider == WebOAuthProvider.github:
        return is_github_configured()
    if provider == WebOAuthProvider.apple:
        return is_apple_configured()
    return False


def _web_oauth_authorize_url(provider: WebOAuthProvider, state: str) -> str:
    if provider == WebOAuthProvider.google:
        return build_google_authorize_url(state)
    if provider == WebOAuthProvider.github:
        return build_github_authorize_url(state)
    if provider == WebOAuthProvider.apple:
        return build_apple_authorize_url(state)
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


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: UserRegister, db: Session = Depends(get_db)) -> User:
    if not body.gdpr_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GDPR consent is required",
        )
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    return _authenticate(form.username, form.password, db)


@router.post("/login/json", response_model=Token)
def login_json(body: UserLogin, db: Session = Depends(get_db)) -> Token:
    return _authenticate(body.email, body.password, db)


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    settings = get_settings()
    message = request_password_reset(db, settings, str(body.email))
    return {"message": message}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
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
    if not user.gdpr_consent_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="GDPR consent missing")
    token = create_access_token(user.email)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.from_user(user)


@router.get("/oauth/status")
def oauth_status() -> dict[str, bool]:
    return {
        "linkedin": is_linkedin_oauth_configured(),
        "google": is_google_configured(),
        "github": is_github_configured(),
        "apple": is_apple_configured(),
    }


@router.get("/linkedin/status")
def linkedin_status() -> dict[str, bool]:
    """True when Client ID, Secret, and redirect URI are set (same gate as token exchange)."""
    return {"configured": is_linkedin_oauth_configured()}


@router.get("/linkedin/login")
def linkedin_login() -> RedirectResponse:
    if not is_linkedin_oauth_configured():
        return RedirectResponse(
            _frontend_login_url(error="linkedin_not_configured"),
            status_code=302,
        )
    state = create_oauth_state()
    return RedirectResponse(build_authorize_url(state), status_code=302)


@router.get("/linkedin/callback")
def linkedin_callback(
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
        return RedirectResponse(_frontend_login_url(error=f"{slug}_not_configured"), status_code=302)
    state = create_oauth_state()
    try:
        url = _web_oauth_authorize_url(provider, state)
    except (GoogleOAuthError, GitHubOAuthError, AppleOAuthError):
        return RedirectResponse(_frontend_login_url(error=f"{slug}_not_configured"), status_code=302)
    return RedirectResponse(url, status_code=302)


@router.api_route("/{provider}/callback", methods=["GET", "POST"])
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
    except (GoogleOAuthError, GitHubOAuthError, AppleOAuthError):
        return RedirectResponse(_frontend_callback_url(error=f"{slug}_failed"), status_code=302)

    if not user.is_active:
        return RedirectResponse(_frontend_callback_url(error="inactive"), status_code=302)

    token = create_access_token(user.email)
    params: dict[str, str] = {"token": token}
    if profile_created:
        params["next"] = "/profile"
        params["oauth"] = "1"
    return RedirectResponse(_frontend_callback_url(**params), status_code=302)