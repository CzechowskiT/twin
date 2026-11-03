"""Authenticated password change (bcrypt verify + invalidate reset + optional revoke)."""

from sqlalchemy.orm import Session

from app.config import get_settings
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
    keep_session_key: str | None = None,
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

    settings = get_settings()
    if bool(getattr(settings, "auth_recovery_v2_session_revoke", True)):
        from app.services import candidate_auth_session as cas

        if keep_session_key:
            cas.revoke_all_other(db, user_id=user.id, keep_session_key=keep_session_key)
        else:
            cas.revoke_everywhere(db, user_id=user.id)
