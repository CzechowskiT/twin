"""Nightly auto-apply consent, settings, and manual trigger."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.deps import get_current_user
from app.database.models import AutoApplyConsent, AutoApplyRun, Candidate, User
from app.database.session import get_db
from app.schemas.auto_apply_settings import (
    AutoApplyConsentIn,
    AutoApplyLastSweepOut,
    AutoApplySettingsOut,
    AutoApplySettingsPatch,
    AutoApplyTriggerOut,
)
from app.services.candidate_readiness import auto_apply_profile_ready
from app.services.nightly_auto_apply import (
    METHOD_MANUAL_TRIGGER,
    process_user_nightly_auto_apply,
    supported_board_ids,
)
from app.tasks.nightly_auto_apply import nightly_auto_apply_sweep

router = APIRouter()

CONSENT_VERSION = "v1"
PROFILE_NOT_READY_DETAIL = "Complete your candidate profile and upload a CV first."


def _get_candidate(db: Session, user_id: int) -> Candidate | None:
    return db.query(Candidate).filter(Candidate.user_id == user_id).first()


def _require_profile_ready(user: User, candidate: Candidate | None) -> None:
    if not auto_apply_profile_ready(user, candidate):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=PROFILE_NOT_READY_DETAIL)


def _next_run_label() -> str:
    s = get_settings()
    h = min(23, max(0, int(s.nightly_auto_apply_hour)))
    m = min(59, max(0, int(s.nightly_auto_apply_minute)))
    return f"{h:02d}:{m:02d} Europe/Warsaw (daily)"


def _to_out(
    consent: AutoApplyConsent | None,
    *,
    user: User,
    candidate: Candidate | None,
) -> AutoApplySettingsOut:
    settings = get_settings()
    ready = auto_apply_profile_ready(user, candidate)
    onboarding_done = user.onboarding_completed_at is not None
    base = dict(
        next_run_label=_next_run_label(),
        supported_boards=", ".join(sorted(supported_board_ids(settings))),
        profile_ready=ready,
        onboarding_completed=onboarding_done,
    )
    if not consent:
        return AutoApplySettingsOut(
            is_active=False,
            min_score_threshold=float(settings.nightly_auto_apply_default_min_score),
            daily_limit=int(settings.nightly_auto_apply_default_daily_limit),
            consent_given_at=None,
            total_applications_submitted=0,
            last_run_at=None,
            **base,
        )
    return AutoApplySettingsOut(
        is_active=bool(consent.is_active),
        min_score_threshold=float(consent.min_score_threshold),
        daily_limit=int(consent.daily_limit),
        consent_given_at=consent.consent_given_at,
        total_applications_submitted=int(consent.total_applications_submitted or 0),
        last_run_at=consent.last_run_at,
        **base,
    )


@router.get("/last-sweep", response_model=AutoApplyLastSweepOut)
def get_last_platform_sweep(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AutoApplyLastSweepOut:
    """Latest nightly sweep across all users (for dashboard observability)."""
    row = db.query(AutoApplyRun).order_by(AutoApplyRun.started_at.desc()).first()
    if not row:
        return AutoApplyLastSweepOut(
            started_at=None,
            finished_at=None,
            total_applications_submitted=0,
            total_applications_failed=0,
        )
    return AutoApplyLastSweepOut(
        started_at=row.started_at,
        finished_at=row.finished_at,
        total_applications_submitted=int(row.total_applications_submitted or 0),
        total_applications_failed=int(row.total_applications_failed or 0),
    )


@router.get("/settings", response_model=AutoApplySettingsOut)
def get_settings_route(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AutoApplySettingsOut:
    candidate = _get_candidate(db, user.id)
    consent = None
    if candidate is not None:
        consent = db.query(AutoApplyConsent).filter(AutoApplyConsent.candidate_id == candidate.id).first()
    return _to_out(consent, user=user, candidate=candidate)


@router.post("/consent", response_model=AutoApplySettingsOut)
def give_consent(
    body: AutoApplyConsentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AutoApplySettingsOut:
    if not body.consent_acknowledged:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Consent must be acknowledged")
    candidate = _get_candidate(db, user.id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create your candidate profile first.")
    _require_profile_ready(user, candidate)
    settings = get_settings()
    now = datetime.now(timezone.utc)
    consent = db.query(AutoApplyConsent).filter(AutoApplyConsent.candidate_id == candidate.id).first()
    if consent:
        consent.is_active = True
        consent.consent_given_at = now
        consent.consent_text_version = CONSENT_VERSION
        consent.min_score_threshold = float(body.min_score_threshold)
        consent.daily_limit = int(body.daily_limit)
        consent.updated_at = now
    else:
        consent = AutoApplyConsent(
            candidate_id=candidate.id,
            is_active=True,
            consent_given_at=now,
            consent_text_version=CONSENT_VERSION,
            min_score_threshold=float(body.min_score_threshold),
            daily_limit=int(body.daily_limit),
        )
        db.add(consent)
    db.commit()
    db.refresh(consent)
    return _to_out(consent, user=user, candidate=candidate)


@router.patch("/settings", response_model=AutoApplySettingsOut)
def patch_settings(
    body: AutoApplySettingsPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AutoApplySettingsOut:
    candidate = _get_candidate(db, user.id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create your candidate profile first.")
    _require_profile_ready(user, candidate)
    consent = db.query(AutoApplyConsent).filter(AutoApplyConsent.candidate_id == candidate.id).first()
    if not consent or not consent.consent_given_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enable auto-apply with consent first")
    if body.is_active is not None:
        consent.is_active = body.is_active
    if body.min_score_threshold is not None:
        consent.min_score_threshold = float(body.min_score_threshold)
    if body.daily_limit is not None:
        consent.daily_limit = int(body.daily_limit)
    consent.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)
    return _to_out(consent, user=user, candidate=candidate)


@router.post("/trigger", response_model=AutoApplyTriggerOut)
def trigger_nightly_for_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AutoApplyTriggerOut:
    """Run the same logic as the nightly job for the current user (demo / test)."""
    candidate = _get_candidate(db, user.id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Create your candidate profile first.")
    _require_profile_ready(user, candidate)
    consent = db.query(AutoApplyConsent).filter(AutoApplyConsent.candidate_id == candidate.id).first()
    if not consent or not consent.is_active or not consent.consent_given_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enable nightly auto-apply with consent before triggering",
        )
    settings = get_settings()
    row = process_user_nightly_auto_apply(
        db,
        user=user,
        consent=consent,
        settings=settings,
        max_jobs=1,
        cooldown_seconds=0,
        application_method=METHOD_MANUAL_TRIGGER,
    )
    submitted = int(row.get("applications_submitted", 0))
    failed = int(row.get("applications_failed", 0))
    reason = row.get("skipped_reason")
    if reason == "rate_limit":
        msg = "Daily auto-apply limit reached for today."
    elif reason == "no_matches":
        msg = "No eligible matches above your score threshold (or already applied)."
    elif submitted > 0 and failed > 0:
        msg = f"Submitted {submitted} application(s); {failed} failed."
    elif submitted > 0:
        msg = f"Submitted {submitted} application(s)."
    elif failed > 0:
        msg = f"No submissions; {failed} attempt(s) failed (portal, CV, or browser)."
    else:
        msg = "No applications submitted."
    return AutoApplyTriggerOut(
        applications_submitted=submitted,
        applications_failed=failed,
        skipped_reason=reason,
        message=msg,
    )


@router.post("/trigger-sweep")
def trigger_full_sweep(
    user: User = Depends(get_current_user),
) -> dict:
    """Enqueue full nightly sweep (ops-style; requires active consent users)."""
    settings = get_settings()
    if settings.celery_task_always_eager:
        return nightly_auto_apply_sweep(dry_run=False)
    async_result = nightly_auto_apply_sweep.delay(dry_run=False)
    return {"task_id": async_result.id, "status": "queued"}
