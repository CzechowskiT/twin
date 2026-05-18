"""Public read-only endpoints (no auth) for traction and investor surfaces."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, Candidate, User
from app.database.session import get_db
from app.scrapers.registry import scrape_board_ids_ordered
from app.schemas.public import MvpStatsOut, ValidatedJobsByBoardItem
from app.services.linkedin_oauth import is_linkedin_oauth_configured
from app.services.mvp_public_metrics import validated_jobs_counts_by_traction_board

router = APIRouter()
logger = logging.getLogger(__name__)


def _stripe_checkout_ready(settings: Settings) -> bool:
    """Match ``billing._checkout_configured``: Premium price is required for Checkout (Pro alone is not enough)."""
    s = settings
    return bool(s.stripe_secret_key.strip() and s.stripe_price_id_premium.strip())


@router.get("/mvp-stats", response_model=MvpStatsOut)
def mvp_stats(db: Session = Depends(get_db)) -> MvpStatsOut:
    """Aggregate product metrics for investor surfaces (no personal fields; all counts from DB or env wiring)."""
    try:
        by_board_tuples = validated_jobs_counts_by_traction_board(db)
        v_jobs = sum(c for _, c in by_board_tuples)
        by_board = [ValidatedJobsByBoardItem(job_board=b, count=c) for b, c in by_board_tuples]
        users = db.query(func.count()).select_from(User).scalar() or 0
        apps = db.query(func.count()).select_from(Application).scalar() or 0
        cv_profiles = (
            db.query(func.count()).select_from(Candidate).filter(Candidate.cv_uploaded_at.isnot(None)).scalar() or 0
        )
        boards = len(scrape_board_ids_ordered())
        s = get_settings()
        return MvpStatsOut(
            validated_jobs=int(v_jobs),
            validated_jobs_by_board=by_board,
            registered_users=int(users),
            total_applications=int(apps),
            profiles_with_cv=int(cv_profiles),
            job_boards_in_registry=boards,
            linkedin_oauth_configured=is_linkedin_oauth_configured(),
            stripe_checkout_ready=_stripe_checkout_ready(s),
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("GET /public/mvp-stats failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from exc
