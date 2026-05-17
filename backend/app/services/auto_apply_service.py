"""Orchestrate auto-apply for a candidate + job."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.automation.apply_engine import run_auto_apply
from app.automation.types import ApplyOutcome
from app.config import get_settings
from app.database.models import Application, ApplicationStatus, Candidate, Job, User
from app.services.cv_tailoring import get_tailoring_pitch_for_job


def auto_apply_for_user(
    db: Session,
    *,
    user: User,
    job_id: int,
    submit: bool,
) -> tuple[ApplyOutcome, str, Application | None]:
    settings = get_settings()
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        return ApplyOutcome.FAILED, "Uzupełnij profil kandydata.", None

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        return ApplyOutcome.FAILED, "Nie znaleziono oferty.", None

    state_dir = Path(settings.auto_apply_state_dir) / str(user.id)
    signals: dict[str, Any] = {}
    if candidate.profile_signals_json:
        try:
            parsed = json.loads(candidate.profile_signals_json)
            signals = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            signals = {}
    motivation_text = get_tailoring_pitch_for_job(signals, job_id)
    result = run_auto_apply(
        job_board=job.job_board,
        job_url=job.url,
        name=candidate.name,
        email=user.email,
        phone=settings.auto_apply_default_phone,
        resume_path=candidate.resume_path,
        motivation_text=motivation_text,
        headless=settings.auto_apply_headless,
        state_dir=state_dir,
        submit=submit,
    )

    app = _upsert_application(db, candidate.id, job_id, result.outcome)
    return result.outcome, result.message, app


def _upsert_application(
    db: Session,
    candidate_id: int,
    job_id: int,
    outcome: ApplyOutcome,
) -> Application:
    from datetime import datetime

    app = (
        db.query(Application)
        .filter(Application.candidate_id == candidate_id, Application.job_id == job_id)
        .first()
    )
    if not app:
        app = Application(candidate_id=candidate_id, job_id=job_id)
        db.add(app)

    if outcome in (ApplyOutcome.SUBMITTED, ApplyOutcome.FORM_FILLED):
        app.status = ApplicationStatus.APPLIED
        app.applied_at = app.applied_at or datetime.utcnow()
        note = "auto-apply"
        app.notes = f"{app.notes or ''}; {note}".strip("; ").strip()
    elif outcome == ApplyOutcome.NEEDS_HUMAN:
        app.status = ApplicationStatus.PENDING
        suffix = "wymaga weryfikacji CAPTCHA"
        app.notes = f"{app.notes}; {suffix}" if app.notes else suffix

    db.commit()
    db.refresh(app)
    return app
