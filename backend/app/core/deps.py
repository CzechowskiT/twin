"""FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.scrape_ops import user_can_trigger_scrape
from app.core.security import decode_access_token
from app.database.models import User
from app.database.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    email = decode_access_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


def require_scrape_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Authenticated users with core GDPR consents may trigger scrape endpoints."""
    if not user_can_trigger_scrape(current_user, get_settings()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Privacy and consent setup incomplete — finish required consents "
                "before refreshing job listings."
            ),
        )
    return current_user
