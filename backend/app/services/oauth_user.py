"""Create or link users from federated OAuth (multi-provider)."""

from datetime import datetime, timezone

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
    if not user.gdpr_consent_at:
        user.gdpr_consent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)


def user_from_oauth(db: Session, profile: OAuthUserProfile) -> User:
    """Resolve user by linked OAuth row, legacy LinkedIn id, email, or create."""
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
        "gdpr_consent_at": datetime.now(timezone.utc),
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
