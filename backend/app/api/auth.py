"""Registration and login."""

from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database.models import User
from app.database.session import get_db
from app.schemas.auth import Token, UserLogin, UserOut, UserRegister
from app.services.linkedin_auth import user_from_linkedin
from app.services.linkedin_oauth import (
    LinkedInOAuthError,
    build_authorize_url,
    create_oauth_state,
    exchange_code_for_profile,
    is_linkedin_oauth_configured,
    verify_oauth_state,
)

router = APIRouter()


def _frontend_callback_url(**params: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    query = urlencode(params)
    return f"{base}/auth/callback?{query}" if query else f"{base}/auth/callback"


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
def me(user: User = Depends(get_current_user)) -> User:
    return user
