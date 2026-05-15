"""Create or link users from LinkedIn OAuth."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import User
from app.services.linkedin_oauth import LinkedInProfile


def user_from_linkedin(db: Session, profile: LinkedInProfile) -> User:
    """Find existing user by LinkedIn id or email, or create a new one."""
    user = db.query(User).filter(User.linkedin_id == profile.linkedin_id).first()
    if user:
        return user

    user = db.query(User).filter(User.email == profile.email).first()
    if user:
        user.linkedin_id = profile.linkedin_id
        if not user.gdpr_consent_at:
            user.gdpr_consent_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        return user

    user = User(
        email=profile.email,
        hashed_password=None,
        linkedin_id=profile.linkedin_id,
        gdpr_consent_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
