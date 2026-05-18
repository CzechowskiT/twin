"""Public read-only endpoints (no auth) for traction and investor surfaces."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database.models import Application, ApplicationStatus, Candidate, User
from app.database.session import get_db
from app.scrapers.registry import scrape_board_ids_ordered
from app.schemas.public import DemoReceiptOut, MvpStatsOut, ValidatedJobsByBoardItem
from app.services.linkedin_oauth import is_linkedin_oauth_configured
from app.services.mvp_public_metrics import validated_jobs_counts_by_traction_board

router = APIRouter()
logger = logging.getLogger(__name__)

_DEMO_INTERVIEW_START = datetime(2026, 6, 2, 14, 0, tzinfo=timezone.utc)
_DEMO_INTERVIEW_END = datetime(2026, 6, 2, 14, 30, tzinfo=timezone.utc)


def _ics_ts(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _demo_ics_bytes() -> bytes:
    stamp = datetime.now(timezone.utc)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TWIN//Public Demo//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "UID:f6c9b2d4-3e1a-5b8c-9d0e-twin-public-demo@twin",
        f"DTSTAMP:{_ics_ts(stamp)}",
        f"DTSTART:{_ics_ts(_DEMO_INTERVIEW_START)}",
        f"DTEND:{_ics_ts(_DEMO_INTERVIEW_END)}",
        "SUMMARY:TWIN public demo — screening slot",
        "DESCRIPTION:Illustrative calendar receipt from the public /demo flow. Not a real employer interview.",
        "LOCATION:Video call (demo)",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


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
        cutoff_7d = datetime.utcnow() - timedelta(days=7)
        applied_7d = (
            db.query(func.count())
            .select_from(Application)
            .filter(
                Application.status == ApplicationStatus.APPLIED,
                or_(
                    Application.applied_at >= cutoff_7d,
                    and_(Application.applied_at.is_(None), Application.updated_at >= cutoff_7d),
                ),
            )
            .scalar()
            or 0
        )
        cutoff_30d = datetime.utcnow() - timedelta(days=30)
        cv_upload_30d = (
            db.query(func.count())
            .select_from(Candidate)
            .filter(Candidate.cv_uploaded_at.isnot(None), Candidate.cv_uploaded_at >= cutoff_30d)
            .scalar()
            or 0
        )
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
            applications_applied_last_7_days=int(applied_7d),
            candidates_cv_uploaded_last_30_days=int(cv_upload_30d),
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


@router.get("/demo-receipt", response_model=DemoReceiptOut)
def public_demo_receipt() -> DemoReceiptOut:
    """Return a fixed sandbox receipt so the marketing /demo page can show a live API handshake.

    Does not create applications, interviews, or calendar events in the database.
    """
    return DemoReceiptOut(
        mode="sandbox",
        apply_outcome="submitted",
        application_reference="DEMO-82914",
        job_title="Senior Fullstack Developer Python React",
        company="SynthRail Logistics SA",
        interview_title="Screening — TWIN demo slot",
        interview_start=_DEMO_INTERVIEW_START.isoformat().replace("+00:00", "Z"),
        interview_end=_DEMO_INTERVIEW_END.isoformat().replace("+00:00", "Z"),
        ics_path="/api/v1/public/demo-interview.ics",
        disclaimer=(
            "Sandbox only: no employer portal was contacted and no personal calendar was written server-side. "
            "Signed-in auto-apply and real interviews use authenticated APIs after consent."
        ),
    )


@router.get("/demo-interview.ics")
def public_demo_interview_ics():
    """Download a static iCalendar file matching ``/public/demo-receipt`` times."""
    from fastapi.responses import Response

    return Response(
        content=_demo_ics_bytes(),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="twin-demo-screening.ics"'},
    )
