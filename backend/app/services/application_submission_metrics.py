"""Aggregate honest submission metrics for public/investor surfaces."""

from __future__ import annotations

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database.models import Application, ApplicationStatus, ConfirmationType, SubmissionStatus


def count_by_submission_status(db: Session, status: SubmissionStatus) -> int:
    return (
        db.query(func.count(Application.id))
        .filter(Application.submission_status == status)
        .scalar()
        or 0
    )


def count_external_submit_confirmed(db: Session) -> int:
    return (
        db.query(func.count(Application.id))
        .filter(
            Application.submission_status == SubmissionStatus.EXTERNAL_SUBMIT_CONFIRMED,
            or_(
                Application.confirmation_type == ConfirmationType.CONFIRMATION_PAGE,
                Application.confirmation_type == ConfirmationType.CONFIRMATION_EMAIL,
                Application.confirmation_type == ConfirmationType.ATS_APPLICATION_ID,
                Application.confirmation_type == ConfirmationType.SCREENSHOT,
                Application.confirmation_type == ConfirmationType.MANUAL_USER_CONFIRMATION,
                Application.confirmation_type == ConfirmationType.API_RESPONSE,
                Application.confirmation_text.isnot(None),
                Application.confirmation_url.isnot(None),
                Application.external_application_id.isnot(None),
                Application.confirmation_email_detected.is_(True),
            ),
        )
        .scalar()
        or 0
    )


def count_responses_received(db: Session) -> int:
    """Pipeline rows marked applied (employer response not separately tracked in MVP)."""
    return (
        db.query(func.count(Application.id))
        .filter(Application.status == ApplicationStatus.APPLIED)
        .scalar()
        or 0
    )


def mvp_submission_counts(db: Session) -> dict[str, int]:
    confirmed = count_external_submit_confirmed(db)
    return {
        "applications_created_in_twin": count_by_submission_status(
            db, SubmissionStatus.APPLICATION_CREATED_IN_TWIN
        ),
        "applications_prepared": count_by_submission_status(db, SubmissionStatus.APPLICATION_PREPARED),
        "external_submit_attempted": count_by_submission_status(
            db, SubmissionStatus.EXTERNAL_SUBMIT_ATTEMPTED
        ),
        "external_submit_confirmed": confirmed,
        "manual_action_required": count_by_submission_status(
            db, SubmissionStatus.MANUAL_ACTION_REQUIRED
        ),
        "submit_failed": count_by_submission_status(db, SubmissionStatus.EXTERNAL_SUBMIT_FAILED),
        "responses_received": count_responses_received(db),
    }
