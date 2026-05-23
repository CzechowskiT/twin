"""Public read-only demo snapshot when DEMO_MODE_ENABLED (no auth, no writes)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.deps import get_current_user
from app.database.models import Job, User
from app.database.session import get_db
from app.schemas.demo import DemoApplyTargetOut, DemoSnapshotOut
from app.services.demo_snapshot import build_demo_snapshot
from app.services.investor_demo_seed import DEMO_APPLY_JOB_EXTERNAL_ID, DEMO_BOARD

router = APIRouter()
logger = logging.getLogger(__name__)


def _require_demo_mode(settings: Settings = Depends(get_settings)) -> Settings:
    if not settings.demo_mode_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return settings


@router.get("/apply-target", response_model=DemoApplyTargetOut)
def demo_apply_target(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> DemoApplyTargetOut:
    """Seeded pracuj investor-demo job for live auto-apply on /demo (auth required)."""
    job = db.execute(
        select(Job).where(
            Job.job_board == DEMO_BOARD,
            Job.external_id == DEMO_APPLY_JOB_EXTERNAL_ID,
        )
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo apply job not seeded. Run scripts/seed-investor-demo.py against this database.",
        )
    return DemoApplyTargetOut(
        job_id=job.id,
        title=job.title or "Senior Python Developer",
        company=job.company or "Nova Hiring PL",
        job_board=job.job_board,
        external_id=job.external_id or DEMO_APPLY_JOB_EXTERNAL_ID,
        url=job.url,
    )


@router.get("/snapshot", response_model=DemoSnapshotOut)
def demo_snapshot(
    db: Session = Depends(get_db),
    settings: Settings = Depends(_require_demo_mode),
) -> DemoSnapshotOut:
    """Anonymized feed for marketing /demo — no user email, ids optional, read-only."""
    try:
        return build_demo_snapshot(db, settings)
    except Exception as exc:
        logger.exception("GET /demo/snapshot failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from exc
