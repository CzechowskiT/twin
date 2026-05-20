"""FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.scrape_ops import scrape_ops_configured, user_has_scrape_ops
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


def require_ops_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Restrict scrape triggers to configured ops user IDs or emails (fail-safe when unset)."""
    settings = get_settings()
    if not scrape_ops_configured(settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Scraping operations require ops role. "
                "On the API host set SCRAPE_OPS_EMAILS to your login email "
                "(or SCRAPE_OPS_USER_IDS to your numeric user id), then redeploy."
            ),
        )
    if not user_has_scrape_ops(current_user, settings):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Insufficient permissions. Scraping requires ops role "
                f"(your user id is {current_user.id}, email {current_user.email})."
            ),
        )
    return current_user
