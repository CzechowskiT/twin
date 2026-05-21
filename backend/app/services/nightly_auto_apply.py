"""Nightly autonomous auto-apply: top matches for consenting candidates."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.automation.types import ApplyOutcome
from app.config import Settings, get_settings
from app.database.models import (
    Application,
    AutoApplyConsent,
    AutoApplyEvent,
    AutoApplyRun,
    Candidate,
    Job,
    JobMatch,
    User,
)
from app.services.auto_apply_guards import enforce_company_cooldown, enforce_job_blocklists
from app.services.auto_apply_service import auto_apply_for_user
from app.services.matching_service import find_top_matches
from app.services.nightly_auto_apply_mail import send_nightly_auto_apply_summary_email

logger = logging.getLogger(__name__)

METHOD_NIGHTLY = "auto_apply_nightly"
METHOD_MANUAL_TRIGGER = "auto_apply_manual_trigger"


def supported_board_ids(settings: Settings) -> frozenset[str]:
    return frozenset(x.strip().lower() for x in settings.nightly_auto_apply_supported_boards.split(",") if x.strip())


def is_supported_job(job: Job, settings: Settings) -> bool:
    board = (job.job_board or "").strip().lower()
    url = (job.url or "").lower()
    if board in supported_board_ids(settings):
        return True
    if "pracuj.pl" in url:
        return True
    return False


def _utc_day_start() -> datetime:
    return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def count_nightly_applications_today(db: Session, *, user_id: int) -> int:
    start = _utc_day_start()
    n = (
        db.query(AutoApplyEvent)
        .filter(
            AutoApplyEvent.user_id == user_id,
            AutoApplyEvent.created_at >= start,
            AutoApplyEvent.outcome.in_(("submitted", "form_filled")),
        )
        .count()
    )
    return int(n or 0)


def eligible_matches(
    db: Session,
    *,
    candidate: Candidate,
    consent: AutoApplyConsent,
    settings: Settings,
    limit: int,
) -> list[JobMatch]:
    """Persisted matches above threshold without an application yet, supported boards only."""
    applied_ids = {
        row[0]
        for row in db.query(Application.job_id).filter(Application.candidate_id == candidate.id).all()
    }
    q = (
        db.query(JobMatch)
        .join(Job, JobMatch.job_id == Job.id)
        .filter(
            JobMatch.candidate_id == candidate.id,
            JobMatch.score >= float(consent.min_score_threshold),
            Job.is_validated.is_(True),
        )
        .order_by(JobMatch.score.desc())
    )
    if applied_ids:
        q = q.filter(JobMatch.job_id.notin_(applied_ids))
    rows = q.limit(max(1, limit * 3)).all()
    out: list[JobMatch] = []
    for row in rows:
        if is_supported_job(row.job, settings):
            out.append(row)
        if len(out) >= limit:
            break
    return out


def process_user_nightly_auto_apply(
    db: Session,
    *,
    user: User,
    consent: AutoApplyConsent,
    settings: Settings,
    submit: bool = True,
) -> dict[str, Any]:
    """Apply to top eligible matches for one user."""
    result: dict[str, Any] = {
        "user_id": user.id,
        "applications_submitted": 0,
        "applications_failed": 0,
        "skipped_reason": None,
    }
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        result["skipped_reason"] = "no_candidate_profile"
        return result

    today_count = count_nightly_applications_today(db, user_id=user.id)
    remaining = max(0, int(consent.daily_limit) - today_count)
    if remaining <= 0:
        result["skipped_reason"] = "rate_limit"
        return result

    find_top_matches(db, candidate, limit=25, min_score=float(consent.min_score_threshold), persist=True)
    matches = eligible_matches(
        db,
        candidate=candidate,
        consent=consent,
        settings=settings,
        limit=remaining,
    )
    if not matches:
        result["skipped_reason"] = "no_matches"
        return result

    cooldown = max(0, int(settings.nightly_auto_apply_cooldown_seconds))
    for match in matches:
        job = match.job
        try:
            enforce_job_blocklists(settings=settings, job=job)
            enforce_company_cooldown(db=db, user_id=user.id, settings=settings, job=job)
        except Exception as exc:
            logger.info("nightly skip user=%s job=%s guards: %s", user.id, job.id, exc)
            result["applications_failed"] += 1
            continue

        if cooldown > 0:
            time.sleep(cooldown)

        outcome, message, app = auto_apply_for_user(
            db,
            user=user,
            job_id=job.id,
            submit=submit,
        )
        _record_event(db, user_id=user.id, job=job, outcome=outcome.value)

        if outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED) and app is not None:
            app.auto_applied = True
            app.application_method = METHOD_NIGHTLY
            db.add(app)
            result["applications_submitted"] += 1
            consent.total_applications_submitted = int(consent.total_applications_submitted or 0) + 1
        else:
            result["applications_failed"] += 1
            logger.warning(
                "nightly auto-apply failed user=%s job=%s outcome=%s msg=%s",
                user.id,
                job.id,
                outcome.value,
                message,
            )

    consent.last_run_at = datetime.now(timezone.utc)
    consent.updated_at = datetime.now(timezone.utc)
    db.add(consent)
    db.commit()

    if result["applications_submitted"] > 0 and (settings.resend_api_key.strip() or settings.smtp_host.strip()):
        try:
            send_nightly_auto_apply_summary_email(
                settings,
                to_email=user.email,
                applications_count=result["applications_submitted"],
            )
        except Exception:
            logger.exception("nightly summary email failed user_id=%s", user.id)

    return result


def run_nightly_auto_apply_sweep(*, dry_run: bool = False) -> dict[str, Any]:
    """Process all users with active consent."""
    from app.database.session import SessionLocal

    settings = get_settings()
    db = SessionLocal()
    started = datetime.now(timezone.utc)
    stats: dict[str, Any] = {
        "dry_run": dry_run,
        "total_users_processed": 0,
        "total_applications_submitted": 0,
        "total_applications_failed": 0,
        "users_skipped_rate_limit": 0,
        "users_skipped_no_matches": 0,
        "started_at": started.isoformat(),
        "finished_at": None,
    }
    try:
        consents = (
            db.query(AutoApplyConsent, User)
            .select_from(AutoApplyConsent)
            .join(Candidate, AutoApplyConsent.candidate_id == Candidate.id)
            .join(User, Candidate.user_id == User.id)
            .filter(
                AutoApplyConsent.is_active.is_(True),
                AutoApplyConsent.consent_given_at.isnot(None),
                User.is_active.is_(True),
            )
            .all()
        )
        logger.info("nightly auto-apply: %s consenting users (dry_run=%s)", len(consents), dry_run)

        for consent, user in consents:
            if dry_run:
                stats["total_users_processed"] += 1
                continue
            row = process_user_nightly_auto_apply(db, user=user, consent=consent, settings=settings)
            stats["total_users_processed"] += 1
            stats["total_applications_submitted"] += int(row.get("applications_submitted", 0))
            stats["total_applications_failed"] += int(row.get("applications_failed", 0))
            reason = row.get("skipped_reason")
            if reason == "rate_limit":
                stats["users_skipped_rate_limit"] += 1
            elif reason == "no_matches":
                stats["users_skipped_no_matches"] += 1

        finished = datetime.now(timezone.utc)
        stats["finished_at"] = finished.isoformat()
        if not dry_run:
            _store_run(db, started=started, finished=finished, stats=stats)
        return stats
    finally:
        db.close()


def _record_event(db: Session, *, user_id: int, job: Job, outcome: str) -> None:
    db.add(
        AutoApplyEvent(
            user_id=user_id,
            job_id=job.id,
            company_key=(job.company or "").strip().lower()[:255] or None,
            outcome=outcome,
        )
    )
    db.commit()


def _store_run(db: Session, *, started: datetime, finished: datetime, stats: dict[str, Any]) -> None:
    run = AutoApplyRun(
        started_at=started,
        finished_at=finished,
        total_users_processed=int(stats.get("total_users_processed", 0)),
        total_applications_submitted=int(stats.get("total_applications_submitted", 0)),
        total_applications_failed=int(stats.get("total_applications_failed", 0)),
        stats_json=json.dumps(stats, default=str),
    )
    db.add(run)
    db.commit()
