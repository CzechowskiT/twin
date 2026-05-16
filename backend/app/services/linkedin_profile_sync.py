"""Create or update candidate profile after LinkedIn sign-in."""

import json

from sqlalchemy.orm import Session

from app.database.models import Candidate, User
from app.services.linkedin_oauth import LinkedInProfile


def ensure_candidate_from_linkedin(db: Session, user: User, profile: LinkedInProfile) -> bool:
    """Ensure a candidate row exists; refresh name from LinkedIn. Returns True if created."""
    name = (profile.name or profile.email.split("@")[0]).strip()
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate:
        if name and candidate.name != name:
            candidate.name = name
            db.commit()
        return False

    candidate = Candidate(
        user_id=user.id,
        name=name[:200],
        skills=json.dumps([]),
        experience_years=0,
        desired_salary=None,
        location=None,
    )
    db.add(candidate)
    db.commit()
    return True
