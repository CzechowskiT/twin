"""Authenticated password change (bcrypt verify + invalidate reset tokens)."""

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.database.models import PasswordResetToken, User


class PasswordChangeError(Exception):
    """Domain error with a stable code for HTTP mapping."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


def change_user_password(
    db: Session,
    user: User,
    *,
    current_password: str,
    new_password: str,
) -> None:
    if not user.hashed_password:
        raise PasswordChangeError("no_password_login")
    if not verify_password(current_password, user.hashed_password):
        raise PasswordChangeError("invalid_current_password")
    if current_password == new_password:
        raise PasswordChangeError("same_password")

    user.hashed_password = hash_password(new_password)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    db.add(user)
    db.commit()
