"""Create or link users from federated OAuth (multi-provider)."""

from sqlalchemy.orm import Session

from app.database.models import OAuthAccount, User
from app.services.oauth_types import OAuthUserProfile


def _link_oauth(db: Session, user: User, profile: OAuthUserProfile) -> None:
    exists = (
        db.query(OAuthAccount)
        .filter(OAuthAccount.provider == profile.provider, OAuthAccount.subject == profile.subject)
        .first()
    )
    if not exists:
        db.add(OAuthAccount(user_id=user.id, provider=profile.provider, subject=profile.subject))
    if profile.provider == "linkedin" and not user.linkedin_id:
        user.linkedin_id = profile.subject
    db.commit()
    db.refresh(user)


def user_from_oauth(db: Session, profile: OAuthUserProfile) -> User:
    """Resolve user by linked OAuth row, legacy LinkedIn id, email, or create.

    New accounts do **not** receive GDPR consent automatically — the client must
    collect explicit acceptance (same as email/password registration).
    """
    acc = (
        db.query(OAuthAccount)
        .filter(OAuthAccount.provider == profile.provider, OAuthAccount.subject == profile.subject)
        .first()
    )
    if acc:
        return acc.user

    user: User | None = None
    if profile.provider == "linkedin":
        user = db.query(User).filter(User.linkedin_id == profile.subject).first()

    if not user:
        user = db.query(User).filter(User.email == profile.email).first()

    if user:
        _link_oauth(db, user, profile)
        return user

    kwargs: dict = {
        "email": profile.email,
        "hashed_password": None,
        "gdpr_consent_at": None,
    }
    if profile.provider == "linkedin":
        kwargs["linkedin_id"] = profile.subject
    user = User(**kwargs)
    db.add(user)
    db.flush()
    db.add(OAuthAccount(user_id=user.id, provider=profile.provider, subject=profile.subject))
    db.commit()
    db.refresh(user)
    return user
