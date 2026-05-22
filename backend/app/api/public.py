"""Public read-only endpoints (no auth) for traction and investor surfaces."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, ApplicationStatus, Candidate, ScheduledInterview, User
from app.database.session import get_db
from app.scrapers.registry import scrape_board_ids_ordered
from app.schemas.public import MvpStatsOut
from app.services.google_calendar_oauth import is_google_calendar_oauth_configured
from app.services.microsoft_calendar_oauth import is_microsoft_calendar_oauth_configured
from app.services.linkedin_oauth import is_linkedin_oauth_configured
from app.services.mail import is_mail_configured
from app.api.health import _database_reachable
from app.services.data_room_upload import object_storage_enabled
from app.services.mvp_public_metrics import count_validated_jobs_public_traction

router = APIRouter()
logger = logging.getLogger(__name__)


def _stripe_checkout_ready(settings: Settings) -> bool:
    s = settings
    return bool(
        s.stripe_secret_key.strip()
        and (s.stripe_price_id_premium.strip() or s.stripe_price_id_pro.strip())
    )


@router.get("/mvp-stats", response_model=MvpStatsOut)
def mvp_stats(db: Session = Depends(get_db)) -> MvpStatsOut:
    """Aggregate product metrics for investor surfaces (no personal fields; all counts from DB or env wiring)."""
    try:
        v_jobs = count_validated_jobs_public_traction(db)
        users = db.query(func.count()).select_from(User).scalar() or 0
        apps = db.query(func.count()).select_from(Application).scalar() or 0
        verified_placements = (
            db.query(func.count())
            .select_from(Application)
            .filter(
                Application.status == ApplicationStatus.HIRED,
                Application.placement_verified_at.isnot(None),
            )
            .scalar()
            or 0
        )
        interviews_scheduled = (
            db.query(func.count()).select_from(ScheduledInterview).scalar() or 0
        )
        cv_profiles = (
            db.query(func.count()).select_from(Candidate).filter(Candidate.cv_uploaded_at.isnot(None)).scalar() or 0
        )
        boards = len(scrape_board_ids_ordered())
        s = get_settings()
        s3_on = object_storage_enabled()
        return MvpStatsOut(
            validated_jobs=int(v_jobs),
            registered_users=int(users),
            total_applications=int(apps),
            verified_placements=int(verified_placements),
            interviews_scheduled=int(interviews_scheduled),
            profiles_with_cv=int(cv_profiles),
            job_boards_in_registry=boards,
            linkedin_oauth_configured=is_linkedin_oauth_configured(),
            stripe_checkout_ready=_stripe_checkout_ready(s),
            mail_configured=is_mail_configured(s),
            google_calendar_configured=is_google_calendar_oauth_configured(),
            microsoft_calendar_configured=is_microsoft_calendar_oauth_configured(),
            database_reachable=_database_reachable(db.get_bind()),
            data_room_s3_enabled=s3_on,
            data_room_local_demo=not s3_on and bool(s.data_room_local_upload_enabled),
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
