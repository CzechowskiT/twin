"""Gamification progress API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.subscription_gates import Feature, feature_allowed, paywall_for_feature
from app.database.models import User
from app.database.session import get_db
from app.schemas.gamification import BadgeOut, GamificationProgressOut
from app.services.career_assistant_common import get_candidate_for_user
from app.services.gamification import progress_snapshot, record_activity

router = APIRouter()


@router.get("/my-progress", response_model=GamificationProgressOut)
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GamificationProgressOut:
    """XP, level, streak, and badges for dashboard."""
    candidate = get_candidate_for_user(db, current_user.id)
    record_activity(db, candidate, event="login")
    snap = progress_snapshot(db, candidate)
    paywall = None if feature_allowed(current_user, Feature.GAMIFICATION_FULL) else paywall_for_feature(
        Feature.GAMIFICATION_FULL
    )
    badges = [BadgeOut(**b) for b in snap.pop("badges", [])]
    return GamificationProgressOut(paywall=paywall, badges=badges, **snap)
