"""Password hashing and JWT helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token_claims(
    claims: dict[str, Any], *, expires_minutes: int | None = None
) -> str:
    """Encode JWT with caller claims + exp. Used by managed sessions and legacy mint."""
    settings = get_settings()
    ttl = expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    expire = datetime.now(timezone.utc) + timedelta(minutes=ttl)
    payload = {**claims, "exp": int(expire.timestamp())}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str, *, expires_minutes: int | None = None) -> str:
    """Legacy helper — sub+exp only (still valid until original expiry)."""
    return create_access_token_claims({"sub": subject}, expires_minutes=expires_minutes)


def decode_access_token_claims(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload if isinstance(payload, dict) else None
    except JWTError:
        return None


def decode_access_token(token: str) -> str | None:
    payload = decode_access_token_claims(token)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None
