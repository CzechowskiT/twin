"""FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
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


def _parse_scrape_ops_user_ids(raw: str) -> set[int]:
    ids: set[int] = set()
    for part in (raw or "").split(","):
        token = part.strip()
        if token.isdigit():
            ids.add(int(token))
    return ids


def require_ops_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Restrict scrape triggers to configured ops user IDs (fail-safe when unset)."""
    ops_ids = _parse_scrape_ops_user_ids(get_settings().scrape_ops_user_ids)
    if not ops_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Scraping operations require ops role. "
                "Configure SCRAPE_OPS_USER_IDS environment variable."
            ),
        )
    if current_user.id not in ops_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Scraping requires ops role.",
        )
    return current_user
