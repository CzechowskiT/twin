"""Create or link users from LinkedIn OAuth."""

from sqlalchemy.orm import Session

from app.database.models import User
from app.services.linkedin_oauth import LinkedInProfile
from app.services.oauth_types import OAuthUserProfile
from app.services.oauth_user import user_from_oauth


def user_from_linkedin(db: Session, profile: LinkedInProfile) -> User:
    """Find existing user by LinkedIn id or email, or create a new one."""
    oauth_profile = OAuthUserProfile(
        provider="linkedin",
        subject=profile.linkedin_id,
        email=profile.email,
        name=profile.name,
    )
    return user_from_oauth(db, oauth_profile)
