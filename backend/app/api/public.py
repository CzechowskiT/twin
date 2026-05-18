"""Public read-only endpoints (no auth) for traction and investor surfaces."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, Candidate, Job, User
from app.database.session import get_db
from app.scrapers.registry import scrape_board_ids_ordered
from app.schemas.public import MvpStatsOut
from app.services.linkedin_oauth import is_linkedin_oauth_configured

router = APIRouter()
logger = logging.getLogger(__name__)


def _stripe_checkout_ready(settings: Settings) -> bool:
    s = settings
    return bool(
        s.stripe_secret_key.strip()
        and (s.stripe_price_id_premium.strip() or s.stripe_price_id_pro.strip())
    )


@router.get("/mvp-stats", response_model=MvpStatsOut, response_model_exclude_none=True)
def mvp_stats(db: Session = Depends(get_db)) -> MvpStatsOut:
    """Aggregate product metrics for fundraising decks (no personal fields)."""
    try:
        v_jobs = db.query(func.count()).select_from(Job).filter(Job.is_validated.is_(True)).scalar() or 0
        users = db.query(func.count()).select_from(User).scalar() or 0
        apps = db.query(func.count()).select_from(Application).scalar() or 0
        cv_profiles = (
            db.query(func.count()).select_from(Candidate).filter(Candidate.cv_uploaded_at.isnot(None)).scalar() or 0
        )
        boards = len(scrape_board_ids_ordered())
        stats = MvpStatsOut(
            validated_jobs=int(v_jobs),
            registered_users=int(users),
            total_applications=int(apps),
            profiles_with_cv=int(cv_profiles),
            job_boards_in_registry=boards,
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )
        s = get_settings()
        if s.investor_mvp_stats_demo_mode:
            force = bool(s.investor_mvp_stats_demo_force_integrations_on)
            li = force or is_linkedin_oauth_configured()
            st = force or _stripe_checkout_ready(s)
            stats = stats.model_copy(
                update={
                    "validated_jobs": int(s.investor_mvp_stats_demo_validated_jobs),
                    "linkedin_oauth_configured": li,
                    "stripe_checkout_ready": st,
                }
            )
        return stats
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("GET /public/mvp-stats failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from exc
