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
from app.services.data_room_upload import object_storage_configured
from app.services.mvp_public_metrics import count_validated_jobs_public_traction
from app.services.subscription_public_metrics import count_paid_subscribers, subscription_mrr_usd

router = APIRouter()
logger = logging.getLogger(__name__)


def _stripe_checkout_ready(settings: Settings) -> bool:
    s = settings
    return bool(
        s.stripe_secret_key.strip()
        and (
            s.stripe_price_id_standby.strip()
            or s.stripe_price_id_standard.strip()
            or s.stripe_price_id_premium.strip()
            or s.stripe_price_id_pro.strip()
        )
    )


def _safe_count(db: Session, label: str, fn: object) -> int:
    """Run a count lambda; log and return 0 so investor surfaces stay up if one query fails."""
    try:
        return int(fn())  # type: ignore[operator]
    except Exception:
        logger.warning("mvp-stats %s count failed", label, exc_info=True)
        return 0


@router.get("/mvp-stats", response_model=MvpStatsOut)
def mvp_stats(db: Session = Depends(get_db)) -> MvpStatsOut:
    """Aggregate product metrics for investor surfaces (no personal fields; all counts from DB or env wiring)."""
    s = get_settings()
    s3_on = object_storage_configured()
    v_jobs = _safe_count(db, "validated_jobs", lambda: count_validated_jobs_public_traction(db))
    users = _safe_count(db, "users", lambda: db.query(func.count()).select_from(User).scalar())
    apps = _safe_count(db, "applications", lambda: db.query(func.count()).select_from(Application).scalar())
    verified_placements = _safe_count(
        db,
        "verified_placements",
        lambda: db.query(func.count())
        .select_from(Application)
        .filter(
            Application.status == ApplicationStatus.HIRED,
            Application.placement_verified_at.isnot(None),
        )
        .scalar(),
    )
    interviews_scheduled = _safe_count(
        db,
        "interviews_scheduled",
        lambda: db.query(func.count()).select_from(ScheduledInterview).scalar(),
    )
    cv_profiles = _safe_count(
        db,
        "cv_profiles",
        lambda: db.query(func.count())
        .select_from(Candidate)
        .filter(Candidate.cv_uploaded_at.isnot(None))
        .scalar(),
    )
    try:
        boards = len(scrape_board_ids_ordered())
    except Exception:
        logger.warning("mvp-stats job_boards_in_registry failed", exc_info=True)
        boards = 0
    db_ok = False
    try:
        db_ok = _database_reachable(db.get_bind())
    except Exception:
        logger.warning("mvp-stats database_reachable check failed", exc_info=True)
    stripe_ready = _stripe_checkout_ready(s)
    return MvpStatsOut(
        validated_jobs=v_jobs,
        registered_users=users,
        total_applications=apps,
        verified_placements=verified_placements,
        interviews_scheduled=interviews_scheduled,
        profiles_with_cv=cv_profiles,
        job_boards_in_registry=boards,
        linkedin_oauth_configured=is_linkedin_oauth_configured(),
        stripe_checkout_ready=stripe_ready,
        mail_configured=is_mail_configured(s),
        google_calendar_configured=is_google_calendar_oauth_configured(),
        microsoft_calendar_configured=is_microsoft_calendar_oauth_configured(),
        database_reachable=db_ok,
        data_room_s3_enabled=s3_on,
        data_room_local_demo=not s3_on and bool(s.data_room_local_upload_enabled),
        paid_subscribers=_safe_count(db, "paid_subscribers", lambda: count_paid_subscribers(db)),
        subscription_mrr_usd=subscription_mrr_usd(db, stripe_checkout_ready=stripe_ready),
        generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
