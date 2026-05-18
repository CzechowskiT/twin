"""Self-serve placement verification via work email magic link."""

from __future__ import annotations

import hashlib
import json
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import Application, ApplicationStatus, Candidate, Job, PlacementEvent, User
from app.services.mail import is_mail_configured, send_placement_verification_email

logger = logging.getLogger(__name__)

PLACEMENT_NONE = "none"
PLACEMENT_VERIFY_PENDING = "verify_pending"
PLACEMENT_VERIFIED = "verified"

_TOKEN_TTL_HOURS = 48
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def hash_placement_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def _work_email_domain(email: str) -> str | None:
    if "@" not in email:
        return None
    return email.rsplit("@", 1)[-1].lower()[:255]


def record_placement_event(
    db: Session,
    *,
    application_id: int,
    event_type: str,
    actor: str,
    detail: dict | None = None,
) -> None:
    """Persist one append-only row (no raw tokens or full mailbox addresses)."""
    body: str | None
    if detail:
        raw = json.dumps(detail, separators=(",", ":"), ensure_ascii=False)
        body = raw[:8000]
    else:
        body = None
    db.add(
        PlacementEvent(
            application_id=application_id,
            event_type=event_type,
            actor=actor,
            detail_json=body,
        )
    )


def _allowed_status(status: ApplicationStatus) -> bool:
    return status in (
        ApplicationStatus.APPLIED,
        ApplicationStatus.INTERVIEW,
        ApplicationStatus.HIRED,
    )


def start_work_email_verification(
    db: Session,
    settings: Settings,
    *,
    user: User,
    application_id: int,
    work_email: str,
) -> tuple[bool, str]:
    """Store token hash, send mail with frontend magic link. Returns (mail_sent, user_message)."""
    email = work_email.strip().lower()
    if not email or not _EMAIL_RE.match(email):
        raise ValueError("Invalid work email address.")

    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise ValueError("Complete your candidate profile first.")

    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not row:
        raise ValueError("Application not found.")
    app, _job = row

    if app.placement_state == PLACEMENT_VERIFIED:
        raise ValueError("Placement is already verified for this application.")

    if not _allowed_status(app.status):
        raise ValueError("Set application status to Applied, Interview, or Hired before verifying placement.")

    raw = secrets.token_urlsafe(32)
    digest = hash_placement_token(raw)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=_TOKEN_TTL_HOURS)

    app.placement_work_email = email[:320]
    app.placement_verification_token_hash = digest
    app.placement_verification_expires_at = expires
    app.placement_state = PLACEMENT_VERIFY_PENDING
    if app.placement_reported_at is None:
        app.placement_reported_at = now

    base = settings.frontend_url.rstrip("/")
    link = f"{base}/dashboard?placement_verify={raw}"

    sent = False
    if is_mail_configured(settings):
        try:
            send_placement_verification_email(settings, to_email=email, verify_url=link)
            sent = True
        except Exception:
            logger.exception("Placement verification email failed application_id=%s", application_id)
    else:
        logger.warning(
            "Placement verify link (no mail configured): application_id=%s url=%s",
            application_id,
            link,
        )

    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.verify_link_issued",
        actor="candidate",
        detail={"work_email_domain": _work_email_domain(email), "mail_sent": sent},
    )
    db.commit()

    msg = (
        "Verification email sent. Open the link from your work inbox."
        if sent
        else "Mail is not configured on the server — check API logs for the verification link, or set SMTP / Resend."
    )
    return sent, msg


def confirm_placement_token(db: Session, raw_token: str) -> tuple[bool, str]:
    """Mark placement verified when token matches and is not expired."""
    if not raw_token.strip():
        return False, "Missing token."
    digest = hash_placement_token(raw_token.strip())
    app = (
        db.query(Application)
        .filter(
            Application.placement_verification_token_hash == digest,
            Application.placement_verification_expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not app:
        return False, "Invalid or expired verification link."

    now = datetime.now(timezone.utc)
    app.placement_verified_at = now
    app.placement_state = PLACEMENT_VERIFIED
    app.placement_verification_token_hash = None
    app.placement_verification_expires_at = None
    promoted = app.status != ApplicationStatus.HIRED
    if promoted:
        app.status = ApplicationStatus.HIRED
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.verify_confirmed",
        actor="magic_link",
        detail={"promoted_to_hired": promoted},
    )
    db.commit()
    return True, "Placement verified. Thank you."
