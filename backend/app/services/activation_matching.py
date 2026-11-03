"""Auto-trigger matching after candidate onboarding (activation / TTV)."""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import ActivationMatchingJob, Candidate, JobMatch, User

logger = logging.getLogger(__name__)

STATUS_PENDING = "pending"
STATUS_DISPATCHED = "dispatched"
STATUS_STARTED = "started"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_NOT_ELIGIBLE = "not_eligible"
STATUS_WORKER_UNAVAILABLE = "worker_unavailable"

TRANSIENT_FAILURES = frozenset({"transient", "worker_unavailable", "timeout"})
VALIDATION_FAILURES = frozenset({"validation", "profile_incomplete", "no_candidate"})

UX_MATCHING = "matching_in_progress"
UX_READY = "matches_ready"
UX_NO_MATCHES = "no_matches"
UX_COULD_NOT_START = "could_not_start"
UX_PROFILE_INCOMPLETE = "profile_incomplete"
UX_WORKER_UNAVAILABLE = "worker_unavailable"
UX_IDLE = "idle"


def _json_list(raw: str | None) -> list[Any]:
    if not raw or not str(raw).strip():
        return []
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def profile_version_for(candidate: Candidate) -> str:
    """Stable hash of fields that affect matching eligibility/output."""
    payload = {
        "skills": candidate.skills or "[]",
        "titles": candidate.preferred_job_titles or "[]",
        "exp": candidate.experience_years or 0,
        "loc": (candidate.location or "").strip().lower(),
        "cv": bool((candidate.cv_text or "").strip() or (candidate.resume_path or "").strip()),
        "cv_at": candidate.cv_uploaded_at.isoformat() if candidate.cv_uploaded_at else "",
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def profile_min_complete(candidate: Candidate | None) -> tuple[bool, str | None]:
    """Min-complete: skills or titles + some signal (CV or experience or location)."""
    if candidate is None:
        return False, "no_candidate"
    skills = _json_list(candidate.skills)
    titles = _json_list(candidate.preferred_job_titles)
    has_signal = bool(skills or titles)
    has_cv = bool((candidate.cv_text or "").strip() or (candidate.resume_path or "").strip())
    has_context = has_cv or (candidate.experience_years or 0) > 0 or bool((candidate.location or "").strip())
    if not has_signal:
        return False, "profile_incomplete"
    if not has_context:
        return False, "profile_incomplete"
    return True, None


def match_count_bucket(count: int) -> str:
    if count <= 0:
        return "0"
    if count <= 2:
        return "1-2"
    if count <= 5:
        return "3-5"
    if count <= 10:
        return "6-10"
    return "11+"


def latency_bucket_seconds(seconds: float | None) -> str | None:
    if seconds is None:
        return None
    s = max(0.0, float(seconds))
    if s < 5:
        return "lt5s"
    if s < 30:
        return "5-30s"
    if s < 300:
        return "30s-5m"
    if s < 3600:
        return "5m-1h"
    if s < 86400:
        return "1h-24h"
    return "gt24h"


def _emit(
    db: Session,
    *,
    event_name: str,
    user_id: int,
    properties: dict[str, Any] | None = None,
    once: bool = False,
) -> None:
    from app.services.product_funnel import emit_funnel_event

    emit_funnel_event(
        db,
        event_name=event_name,
        user_id=user_id,
        properties=properties,
        once=once,
        commit=False,
    )


def _latest_job(db: Session, user_id: int) -> ActivationMatchingJob | None:
    return (
        db.query(ActivationMatchingJob)
        .filter(ActivationMatchingJob.user_id == user_id)
        .order_by(ActivationMatchingJob.created_at.desc(), ActivationMatchingJob.id.desc())
        .first()
    )


def maybe_dispatch_after_onboarding(
    db: Session,
    user: User,
    *,
    trigger: str = "onboarding_complete",
) -> dict[str, Any]:
    """Evaluate eligibility and enqueue matching (idempotent per user+profile_version)."""
    settings = get_settings()
    if not settings.activation_auto_matching_enabled:
        return {"status": "disabled", "ux_state": UX_IDLE, "retry_available": False}

    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    eligible, reason = profile_min_complete(candidate)
    if not eligible or candidate is None:
        _emit(
            db,
            event_name="activation_matching_not_eligible",
            user_id=user.id,
            properties={"source": "api", "trigger": trigger, "failure_category": reason or "profile_incomplete"},
            once=True,
        )
        # Record not_eligible job once per profile version when candidate exists
        if candidate is not None:
            pv = profile_version_for(candidate)
            existing = (
                db.query(ActivationMatchingJob)
                .filter(
                    ActivationMatchingJob.user_id == user.id,
                    ActivationMatchingJob.profile_version == pv,
                )
                .first()
            )
            if existing is None:
                job = ActivationMatchingJob(
                    user_id=user.id,
                    candidate_id=candidate.id,
                    profile_version=pv,
                    correlation_id=str(uuid.uuid4()),
                    status=STATUS_NOT_ELIGIBLE,
                    failure_category=reason or "profile_incomplete",
                )
                db.add(job)
        db.commit()
        return {
            "status": STATUS_NOT_ELIGIBLE,
            "ux_state": UX_PROFILE_INCOMPLETE,
            "retry_available": False,
            "failure_category": reason,
        }

    pv = profile_version_for(candidate)
    existing = (
        db.query(ActivationMatchingJob)
        .filter(
            ActivationMatchingJob.user_id == user.id,
            ActivationMatchingJob.profile_version == pv,
        )
        .first()
    )
    if existing is not None:
        return _status_payload(db, user, existing)

    _emit(
        db,
        event_name="activation_matching_eligible",
        user_id=user.id,
        properties={"source": "api", "trigger": trigger, "profile_version": pv},
        once=True,
    )

    correlation_id = str(uuid.uuid4())
    job = ActivationMatchingJob(
        user_id=user.id,
        candidate_id=candidate.id,
        profile_version=pv,
        correlation_id=correlation_id,
        status=STATUS_PENDING,
    )
    db.add(job)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(ActivationMatchingJob)
            .filter(
                ActivationMatchingJob.user_id == user.id,
                ActivationMatchingJob.profile_version == pv,
            )
            .first()
        )
        if existing:
            return _status_payload(db, user, existing)
        raise

    return _enqueue_job(db, user, job, trigger=trigger)


def _enqueue_job(
    db: Session,
    user: User,
    job: ActivationMatchingJob,
    *,
    trigger: str,
) -> dict[str, Any]:
    settings = get_settings()
    now = datetime.utcnow()
    job.status = STATUS_DISPATCHED
    job.dispatched_at = now
    job.updated_at = now
    _emit(
        db,
        event_name="activation_matching_dispatched",
        user_id=user.id,
        properties={
            "source": "api",
            "trigger": trigger,
            "profile_version": job.profile_version,
            "correlation_id": job.correlation_id,
        },
        once=False,
    )
    db.commit()
    db.refresh(job)
    try:
        from app.tasks.activation_matching_tasks import run_activation_matching_task

        if settings.celery_task_always_eager:
            # Same DB session — avoid SessionLocal() hitting prod/dev Postgres in tests/eager.
            run_matching_job(db, job.id)
            job.celery_task_id = "eager"
            db.commit()
            db.refresh(job)
        else:
            async_result = run_activation_matching_task.delay(job.id)
            job.celery_task_id = async_result.id
            db.add(job)
            db.commit()
            db.refresh(job)
        return _status_payload(db, user, job)
    except Exception as exc:
        logger.warning(
            "activation_matching_dispatch_failed",
            extra={"user_id": user.id, "job_id": job.id, "error": type(exc).__name__},
        )
        job.status = STATUS_WORKER_UNAVAILABLE
        job.failure_category = "worker_unavailable"
        job.updated_at = datetime.utcnow()
        _emit(
            db,
            event_name="activation_matching_failed",
            user_id=user.id,
            properties={
                "source": "api",
                "trigger": trigger,
                "profile_version": job.profile_version,
                "correlation_id": job.correlation_id,
                "failure_category": "worker_unavailable",
            },
            once=False,
        )
        db.commit()
        db.refresh(job)
        return _status_payload(db, user, job)


def run_matching_job(db: Session, job_id: int) -> str:
    """Execute matching for an activation job (called from Celery)."""
    job = db.query(ActivationMatchingJob).filter(ActivationMatchingJob.id == job_id).first()
    if job is None:
        return "missing_job"
    if job.status == STATUS_COMPLETED:
        return "already_completed"
    if job.status == STATUS_NOT_ELIGIBLE:
        return "not_eligible"

    user = db.query(User).filter(User.id == job.user_id).first()
    candidate = db.query(Candidate).filter(Candidate.id == job.candidate_id).first()
    if user is None or candidate is None:
        job.status = STATUS_FAILED
        job.failure_category = "validation"
        job.completed_at = datetime.utcnow()
        job.updated_at = job.completed_at
        db.commit()
        return "validation"

    eligible, reason = profile_min_complete(candidate)
    if not eligible:
        job.status = STATUS_FAILED
        job.failure_category = reason or "validation"
        job.completed_at = datetime.utcnow()
        job.updated_at = job.completed_at
        _emit(
            db,
            event_name="activation_matching_failed",
            user_id=user.id,
            properties={
                "source": "worker",
                "trigger": "activation_task",
                "profile_version": job.profile_version,
                "correlation_id": job.correlation_id,
                "failure_category": job.failure_category,
            },
            once=False,
        )
        db.commit()
        return "validation"

    now = datetime.utcnow()
    job.status = STATUS_STARTED
    job.started_at = now
    job.updated_at = now
    _emit(
        db,
        event_name="activation_matching_started",
        user_id=user.id,
        properties={
            "source": "worker",
            "trigger": "activation_task",
            "profile_version": job.profile_version,
            "correlation_id": job.correlation_id,
        },
        once=False,
    )
    db.commit()

    try:
        from app.services.matching_service import find_top_matches
        from app.services.product_funnel import emit_first_match_if_needed

        rows = find_top_matches(db, candidate, limit=25, min_score=40.0, persist=True)
        count = len(rows)
        job.match_count = count
        job.status = STATUS_COMPLETED
        job.completed_at = datetime.utcnow()
        job.updated_at = job.completed_at
        job.failure_category = None
        latency = None
        if job.dispatched_at:
            latency = (job.completed_at - job.dispatched_at).total_seconds()
        _emit(
            db,
            event_name="activation_matching_completed",
            user_id=user.id,
            properties={
                "source": "worker",
                "trigger": "activation_task",
                "profile_version": job.profile_version,
                "correlation_id": job.correlation_id,
                "match_count_bucket": match_count_bucket(count),
                "latency_bucket": latency_bucket_seconds(latency),
            },
            once=False,
        )
        if count > 0:
            emit_first_match_if_needed(db, user_id=user.id, candidate_id=candidate.id)
            _emit(
                db,
                event_name="activation_first_match_created",
                user_id=user.id,
                properties={
                    "source": "worker",
                    "trigger": "activation_task",
                    "profile_version": job.profile_version,
                    "correlation_id": job.correlation_id,
                    "match_count_bucket": match_count_bucket(count),
                },
                once=True,
            )
        db.commit()
        return f"completed_matches={count}"
    except Exception as exc:
        logger.exception("activation_matching_run_failed", extra={"job_id": job_id})
        # Re-raise transient so Celery can retry; mark failed only if exhausted by task wrapper
        category = "transient"
        msg = str(exc).lower()
        if "validation" in msg or "integrity" in msg:
            category = "validation"
            job.status = STATUS_FAILED
            job.failure_category = category
            job.completed_at = datetime.utcnow()
            job.updated_at = job.completed_at
            _emit(
                db,
                event_name="activation_matching_failed",
                user_id=user.id,
                properties={
                    "source": "worker",
                    "trigger": "activation_task",
                    "profile_version": job.profile_version,
                    "correlation_id": job.correlation_id,
                    "failure_category": category,
                },
                once=False,
            )
            db.commit()
            return "validation"
        job.failure_category = category
        job.retry_count = int(job.retry_count or 0) + 1
        job.updated_at = datetime.utcnow()
        db.commit()
        raise


def mark_job_failed_exhausted(db: Session, job_id: int) -> None:
    job = db.query(ActivationMatchingJob).filter(ActivationMatchingJob.id == job_id).first()
    if job is None or job.status == STATUS_COMPLETED:
        return
    job.status = STATUS_FAILED
    job.failure_category = job.failure_category or "transient"
    job.completed_at = datetime.utcnow()
    job.updated_at = job.completed_at
    _emit(
        db,
        event_name="activation_matching_failed",
        user_id=job.user_id,
        properties={
            "source": "worker",
            "trigger": "activation_task",
            "profile_version": job.profile_version,
            "correlation_id": job.correlation_id,
            "failure_category": job.failure_category,
        },
        once=False,
    )
    db.commit()


def _status_payload(db: Session, user: User, job: ActivationMatchingJob | None) -> dict[str, Any]:
    settings = get_settings()
    match_count = 0
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate is not None:
        match_count = (
            db.query(JobMatch).filter(JobMatch.candidate_id == candidate.id).count() or 0
        )

    if job is None:
        eligible, _ = profile_min_complete(candidate)
        return {
            "status": "none",
            "ux_state": UX_PROFILE_INCOMPLETE if not eligible else UX_IDLE,
            "retry_available": bool(eligible and settings.activation_auto_matching_enabled),
            "match_count": match_count,
            "correlation_id": None,
            "failure_category": None,
            "auto_matching_enabled": settings.activation_auto_matching_enabled,
        }

    ux = UX_IDLE
    retry = False
    if job.status in (STATUS_PENDING, STATUS_DISPATCHED, STATUS_STARTED):
        ux = UX_MATCHING
    elif job.status == STATUS_COMPLETED:
        ux = UX_READY if (job.match_count or match_count) > 0 else UX_NO_MATCHES
    elif job.status == STATUS_NOT_ELIGIBLE:
        ux = UX_PROFILE_INCOMPLETE
        retry = False
    elif job.status == STATUS_WORKER_UNAVAILABLE:
        ux = UX_WORKER_UNAVAILABLE
        retry = True
    elif job.status == STATUS_FAILED:
        cat = job.failure_category or "transient"
        if cat in VALIDATION_FAILURES:
            ux = UX_PROFILE_INCOMPLETE if cat == "profile_incomplete" else UX_COULD_NOT_START
            retry = False
        else:
            ux = UX_COULD_NOT_START
            retry = True

    # Late matches: job completed empty but matches arrived later via sync GET
    if ux == UX_NO_MATCHES and match_count > 0:
        ux = UX_READY

    return {
        "status": job.status,
        "ux_state": ux,
        "retry_available": retry and settings.activation_auto_matching_enabled,
        "match_count": int(job.match_count if job.match_count is not None else match_count),
        "correlation_id": job.correlation_id,
        "failure_category": job.failure_category,
        "profile_version": job.profile_version,
        "auto_matching_enabled": settings.activation_auto_matching_enabled,
    }


def get_activation_status(db: Session, user: User) -> dict[str, Any]:
    job = _latest_job(db, user.id)
    return _status_payload(db, user, job)


def retry_activation_matching(db: Session, user: User) -> dict[str, Any]:
    """User-initiated retry — only when previous failure was transient."""
    settings = get_settings()
    if not settings.activation_auto_matching_enabled:
        return {"status": "disabled", "ux_state": UX_IDLE, "retry_available": False}

    job = _latest_job(db, user.id)
    if job is None:
        return maybe_dispatch_after_onboarding(db, user, trigger="manual_retry")

    if job.status in (STATUS_PENDING, STATUS_DISPATCHED, STATUS_STARTED):
        return _status_payload(db, user, job)

    if job.status == STATUS_COMPLETED:
        return _status_payload(db, user, job)

    cat = job.failure_category or ""
    if cat in VALIDATION_FAILURES or job.status == STATUS_NOT_ELIGIBLE:
        return {
            **_status_payload(db, user, job),
            "retry_available": False,
        }

    # New profile version → new job; same version → reset and re-enqueue
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if candidate is None:
        return _status_payload(db, user, job)
    pv = profile_version_for(candidate)
    if pv != job.profile_version:
        return maybe_dispatch_after_onboarding(db, user, trigger="manual_retry")

    job.status = STATUS_PENDING
    job.failure_category = None
    job.updated_at = datetime.utcnow()
    job.completed_at = None
    db.commit()
    return _enqueue_job(db, user, job, trigger="manual_retry")


def record_activation_ttv_view(
    db: Session,
    user: User,
    *,
    surface: str = "matches_activated",
) -> dict[str, Any]:
    """Server-side activation_ttv_matches_view — once per user (refresh-safe)."""
    job = _latest_job(db, user.id)
    props: dict[str, Any] = {"source": "server", "surface": surface}
    if job is not None:
        props["correlation_id"] = job.correlation_id
        props["profile_version"] = job.profile_version
        if job.status == STATUS_COMPLETED:
            props["match_count_bucket"] = match_count_bucket(int(job.match_count or 0))
        else:
            props["matching_status"] = job.status
    from app.services.product_funnel import emit_funnel_event

    row = emit_funnel_event(
        db,
        event_name="activation_ttv_matches_view",
        user_id=user.id,
        properties=props,
        once=True,
        commit=True,
    )
    return {"recorded": row is not None, "deduped": row is None}
