"""Honest external submission phases vs legacy ApplicationStatus."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.automation.types import ApplyOutcome
from app.database.models import (
    Application,
    ApplicationStatus,
    ConfirmationType,
    Job,
    SubmissionStatus,
    SupportedApplyMode,
)

VERIFIED_AUTO_APPLY_BOARDS = frozenset({"pracuj.pl", "pracuj"})

METHOD_DEMO_SIMULATED = "auto_apply_demo_simulated"
METHOD_ONE_CLICK = "one_click_apply"
METHOD_MANUAL_LINK = "manual_link_open"
METHOD_AUTO_APPLY = "auto_apply"


def supported_apply_mode_for_board(job_board: str) -> SupportedApplyMode:
    board = (job_board or "").lower().strip()
    if board in VERIFIED_AUTO_APPLY_BOARDS:
        return SupportedApplyMode.VERIFIED_AUTO_APPLY
    if board in ("indeed.com", "indeed", "rocketjobs.pl", "rocketjobs"):
        return SupportedApplyMode.ASSISTED_APPLY
    return SupportedApplyMode.UNSUPPORTED


def has_submission_evidence(app: Application) -> bool:
    ctype = app.confirmation_type
    if ctype and ctype != ConfirmationType.NONE:
        return True
    if app.confirmation_text and str(app.confirmation_text).strip():
        return True
    if app.confirmation_url and str(app.confirmation_url).strip():
        return True
    if app.confirmation_screenshot_path and str(app.confirmation_screenshot_path).strip():
        return True
    if app.confirmation_email_detected:
        return True
    if app.external_application_id and str(app.external_application_id).strip():
        return True
    return False


def can_mark_external_submit_confirmed(app: Application) -> bool:
    return app.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED and has_submission_evidence(
        app
    )


def append_submit_log(app: Application, entry: dict[str, Any]) -> None:
    logs: list[dict[str, Any]] = []
    if app.submit_attempt_logs:
        try:
            parsed = json.loads(app.submit_attempt_logs)
            if isinstance(parsed, list):
                logs = parsed
        except json.JSONDecodeError:
            logs = []
    logs.append({**entry, "at": datetime.utcnow().isoformat() + "Z"})
    app.submit_attempt_logs = json.dumps(logs[-50:])


def apply_outcome_to_submission(
    outcome: ApplyOutcome,
    *,
    submit: bool,
    demo_simulated: bool = False,
) -> SubmissionStatus:
    if demo_simulated:
        return SubmissionStatus.APPLICATION_PREPARED
    if outcome == ApplyOutcome.FORM_FILLED:
        return SubmissionStatus.APPLICATION_PREPARED
    if outcome == ApplyOutcome.SUBMITTED:
        return SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED
    if outcome == ApplyOutcome.FAILED:
        return SubmissionStatus.EXTERNAL_SUBMIT_FAILED
    if outcome in (ApplyOutcome.NEEDS_HUMAN, ApplyOutcome.UNSUPPORTED):
        return SubmissionStatus.MANUAL_ACTION_REQUIRED
    return SubmissionStatus.APPLICATION_CREATED_IN_TWIN


def sync_legacy_status_from_submission(app: Application) -> None:
    """Map submission phase to ApplicationStatus without claiming external confirmation."""
    sub = app.submission_status
    if sub == SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED and has_submission_evidence(app):
        app.status = ApplicationStatus.APPLIED
        app.applied_at = app.applied_at or app.submitted_at or datetime.utcnow()
        return
    if sub in (
        SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED,
        SubmissionStatus.APPLICATION_PREPARED,
        SubmissionStatus.MANUAL_ACTION_REQUIRED,
        SubmissionStatus.APPLICATION_CREATED_IN_TWIN,
        SubmissionStatus.EXTERNAL_SUBMIT_FAILED,
    ):
        if app.status == ApplicationStatus.APPLIED and not has_submission_evidence(app):
            app.status = ApplicationStatus.PENDING
            app.applied_at = None


def record_submission_from_auto_apply(
    app: Application,
    *,
    outcome: ApplyOutcome,
    submit: bool,
    job: Job,
    demo_simulated: bool = False,
    failure_reason: str | None = None,
    message: str | None = None,
) -> None:
    now = datetime.utcnow()
    sub = apply_outcome_to_submission(outcome, submit=submit, demo_simulated=demo_simulated)
    app.submission_status = sub
    app.supported_apply_mode = (
        SupportedApplyMode.MANUAL_ONLY if demo_simulated else supported_apply_mode_for_board(job.job_board)
    )
    app.requires_manual_action = sub in (
        SubmissionStatus.MANUAL_ACTION_REQUIRED,
        SubmissionStatus.APPLICATION_PREPARED,
    )
    if sub == SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED:
        app.submit_attempted_at = app.submit_attempted_at or now
    if sub == SubmissionStatus.EXTERNAL_SUBMIT_FAILED:
        app.failure_reason = (failure_reason or message or "auto_apply_failed")[:2000]
    elif failure_reason:
        app.failure_reason = failure_reason[:2000]
    app.confirmation_type = ConfirmationType.NONE
    app.submitted_at = None
    append_submit_log(
        app,
        {
            "source": "auto_apply",
            "outcome": outcome.value,
            "submit": submit,
            "submission_status": sub.value,
            "message": (message or "")[:500],
        },
    )
    sync_legacy_status_from_submission(app)


def record_submission_link_opened(app: Application, *, job: Job) -> None:
    app.submission_status = SubmissionStatus.MANUAL_ACTION_REQUIRED
    app.supported_apply_mode = SupportedApplyMode.MANUAL_ONLY
    app.requires_manual_action = True
    app.application_method = METHOD_MANUAL_LINK
    append_submit_log(app, {"source": "manual_link_open"})
    sync_legacy_status_from_submission(app)


def record_submission_one_click(app: Application, *, job: Job) -> None:
    app.submission_status = SubmissionStatus.APPLICATION_PREPARED
    app.supported_apply_mode = SupportedApplyMode.MANUAL_ONLY
    app.requires_manual_action = True
    app.application_method = METHOD_ONE_CLICK
    note = "One-click apply via TWIN profile"
    app.notes = note if not app.notes else f"{app.notes}; {note}"
    append_submit_log(app, {"source": "one_click_apply"})
    sync_legacy_status_from_submission(app)


def record_submission_created_in_twin(app: Application) -> None:
    app.submission_status = SubmissionStatus.APPLICATION_CREATED_IN_TWIN
    app.requires_manual_action = False
    append_submit_log(app, {"source": "application_create"})


def confirm_external_submission(
    app: Application,
    *,
    confirmation_type: ConfirmationType,
    confirmation_text: str | None = None,
    confirmation_url: str | None = None,
    external_application_id: str | None = None,
    confirmation_email_detected: bool = False,
) -> None:
    if confirmation_type == ConfirmationType.NONE and not any(
        (
            confirmation_text,
            confirmation_url,
            external_application_id,
            confirmation_email_detected,
        )
    ):
        raise ValueError("external_submit_confirmed requires evidence")
    now = datetime.utcnow()
    app.submission_status = SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED
    app.confirmation_type = confirmation_type
    if confirmation_text:
        app.confirmation_text = confirmation_text[:4000]
    if confirmation_url:
        app.confirmation_url = confirmation_url[:2000]
    if external_application_id:
        app.external_application_id = external_application_id[:255]
    app.confirmation_email_detected = confirmation_email_detected
    app.submitted_at = now
    app.requires_manual_action = False
    app.failure_reason = None
    sync_legacy_status_from_submission(app)


def record_user_pipeline_status(app: Application, status: ApplicationStatus) -> None:
    """User-set pipeline status (interview/rejected/hired/applied) — honest submission unchanged unless applied."""
    app.status = status
    if status == ApplicationStatus.APPLIED:
        if not has_submission_evidence(app):
            confirm_external_submission(
                app,
                confirmation_type=ConfirmationType.MANUAL_USER_CONFIRMATION,
                confirmation_text="User marked application as applied in TWIN.",
            )
        return
    if status in (ApplicationStatus.INTERVIEW, ApplicationStatus.HIRED):
        app.requires_manual_action = False
    if status == ApplicationStatus.REJECTED:
        app.requires_manual_action = False


def display_submission_status(app: Application) -> str:
    """Value safe for UI/i18n keys (submission phase)."""
    if app.submission_status:
        return app.submission_status.value
    if app.status == ApplicationStatus.INTERVIEW:
        return "interview_scheduled"
    if app.status == ApplicationStatus.HIRED:
        return "hired"
    if app.status == ApplicationStatus.REJECTED:
        return "rejected"
    if app.status == ApplicationStatus.APPLIED:
        if has_submission_evidence(app):
            return SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED.value
        return SubmissionStatus.MANUAL_ACTION_REQUIRED.value
    return SubmissionStatus.APPLICATION_CREATED_IN_TWIN.value


def count_submission_status(db: Session, status: SubmissionStatus) -> int:
    return (
        db.query(Application)
        .filter(Application.submission_status == status)
        .count()
    )
