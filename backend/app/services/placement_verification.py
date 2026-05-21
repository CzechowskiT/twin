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
from app.services.mail import (
    is_mail_configured,
    send_employer_attestation_email,
    send_placement_verification_email,
)

logger = logging.getLogger(__name__)

PLACEMENT_NONE = "none"
PLACEMENT_DECLARED = "declared"
PLACEMENT_VERIFY_PENDING = "verify_pending"
PLACEMENT_VERIFIED = "verified"
PLACEMENT_DISPUTED = "disputed"

_TOKEN_TTL_HOURS = 48
_EMPLOYER_ATTEST_TTL_DAYS = 14
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
    owner_user_id: int | None = None,
    from_magic_link: bool = False,
) -> None:
    """Persist one append-only row (no raw tokens or full mailbox addresses).

    Callers must pass ``owner_user_id`` for candidate-initiated flows, or
    ``from_magic_link=True`` only after ``confirm_placement_token`` has already
    authenticated the row via hashed token (defense-in-depth against IDOR).
    """
    if from_magic_link:
        exists = db.query(Application.id).filter(Application.id == application_id).first()
        if not exists:
            raise ValueError("Application not found.")
    elif owner_user_id is not None:
        ok = (
            db.query(Application.id)
            .join(Candidate, Candidate.id == Application.candidate_id)
            .filter(Application.id == application_id, Candidate.user_id == owner_user_id)
            .first()
        )
        if not ok:
            raise ValueError("Application not found.")
    else:
        raise ValueError("Placement event requires owner_user_id or from_magic_link.")

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


def declare_placement_intent(
    db: Session,
    *,
    user: User,
    application_id: int,
    note: str | None,
) -> Application:
    """In-app self-declaration before work-email verification (audit + state)."""
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
    if app.placement_state == PLACEMENT_VERIFY_PENDING:
        raise ValueError("A verification link is already pending — check your work inbox or wait for it to expire.")
    if not _allowed_status(app.status):
        raise ValueError("Set application status to Applied, Interview, or Hired before declaring placement.")

    now = datetime.now(timezone.utc)
    cleaned = (note or "").strip()[:2000] or None

    if app.placement_state == PLACEMENT_NONE:
        app.placement_state = PLACEMENT_DECLARED
        app.placement_reported_at = now
        app.placement_declaration_note = cleaned
    elif app.placement_state == PLACEMENT_DECLARED:
        app.placement_declaration_note = cleaned
    else:
        raise ValueError("Invalid placement state for declaration.")

    app.updated_at = datetime.utcnow()
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.self_declared",
        actor="candidate",
        detail={"has_note": bool(cleaned), "note_chars": len(cleaned or "")},
        owner_user_id=user.id,
    )
    db.commit()
    db.refresh(app)
    return app


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

    if app.placement_state not in (PLACEMENT_DECLARED, PLACEMENT_VERIFY_PENDING):
        raise ValueError(
            "Confirm your placement intent in the dashboard before requesting a work-email verification link.",
        )

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
        owner_user_id=user.id,
    )
    db.commit()

    msg = (
        "Verification email sent. Open the link from your work inbox."
        if sent
        else "Mail is not configured on the server — check API logs for the verification link, or set SMTP / Resend."
    )
    return sent, msg


def file_placement_dispute(
    db: Session,
    *,
    user: User,
    application_id: int,
    reason: str | None,
) -> Application:
    """Candidate flags a conflict — ops triage via events, not email ping-pong."""
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if not candidate:
        raise ValueError("Complete your candidate profile first.")
    app = (
        db.query(Application)
        .filter(Application.id == application_id, Application.candidate_id == candidate.id)
        .first()
    )
    if not app:
        raise ValueError("Application not found.")
    if app.placement_state in (PLACEMENT_NONE, PLACEMENT_DISPUTED):
        raise ValueError("Nothing to dispute on this application yet.")
    cleaned = (reason or "").strip()[:2000] or None
    app.placement_state = PLACEMENT_DISPUTED
    app.updated_at = datetime.utcnow()
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.disputed",
        actor="candidate",
        detail={"has_reason": bool(cleaned), "reason_chars": len(cleaned or "")},
        owner_user_id=user.id,
    )
    db.commit()
    db.refresh(app)
    return app


def ops_resolve_placement_dispute(
    db: Session,
    *,
    application_id: int,
    resolution: str,
    note: str | None = None,
) -> Application:
    """Ops closes a dispute without email ping-pong — verified or back to declared."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise ValueError("Application not found.")
    if app.placement_state != PLACEMENT_DISPUTED:
        raise ValueError("Application is not in disputed state.")
    cleaned_note = (note or "").strip()[:2000] or None
    res = resolution.strip().lower()
    if res == "verified":
        app.placement_state = PLACEMENT_VERIFIED
        app.placement_verified_at = datetime.now(timezone.utc)
        event_type = "placement.ops_resolved_verified"
    elif res == "dismissed":
        app.placement_state = PLACEMENT_DECLARED
        event_type = "placement.ops_resolved_dismissed"
    else:
        raise ValueError("resolution must be 'verified' or 'dismissed'")
    app.updated_at = datetime.now(timezone.utc)
    record_placement_event(
        db,
        application_id=app.id,
        event_type=event_type,
        actor="ops_admin",
        detail={"resolution": res, "has_note": bool(cleaned_note)},
        from_magic_link=True,
    )
    db.commit()
    db.refresh(app)
    return app


def issue_employer_attestation_link(
    db: Session,
    settings: Settings,
    *,
    user: User,
    application_id: int,
    employer_email: str | None = None,
) -> tuple[str, str, bool]:
    """Generate a shareable employer attestation URL (no employer email required)."""
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
    app, job = row
    if app.placement_state == PLACEMENT_VERIFIED:
        raise ValueError("Placement is already verified.")
    if app.placement_state == PLACEMENT_NONE:
        raise ValueError("Declare placement intent before sharing an employer attestation link.")

    raw = secrets.token_urlsafe(32)
    digest = hash_placement_token(raw)
    now = datetime.now(timezone.utc)
    app.placement_employer_attest_token_hash = digest
    app.placement_employer_attest_expires_at = now + timedelta(days=_EMPLOYER_ATTEST_TTL_DAYS)
    app.updated_at = datetime.utcnow()

    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.employer_attest_link_issued",
        actor="candidate",
        detail={"expires_days": _EMPLOYER_ATTEST_TTL_DAYS},
        owner_user_id=user.id,
    )
    db.commit()

    url = f"{settings.frontend_url.rstrip('/')}/placement/employer?token={raw}"
    exp = app.placement_employer_attest_expires_at
    exp_s = exp.isoformat() + "Z" if exp and exp.tzinfo is None else (exp.isoformat() if exp else "")
    mail_sent = False
    emp = (employer_email or "").strip().lower()
    if emp and _EMAIL_RE.match(emp) and is_mail_configured(settings):
        try:
            send_employer_attestation_email(
                settings, to_email=emp, attest_url=url, company_name=job.company
            )
            mail_sent = True
            record_placement_event(
                db,
                application_id=app.id,
                event_type="placement.employer_attest_email_sent",
                actor="system",
                detail={"mail_sent": True},
                owner_user_id=user.id,
            )
            db.commit()
        except Exception:
            logger.exception("employer attestation email failed application_id=%s", application_id)
    return url, exp_s, mail_sent


def preview_employer_attestation(db: Session, raw_token: str) -> dict | None:
    """Return non-sensitive context for employer landing (company, role)."""
    if not raw_token.strip():
        return None
    digest = hash_placement_token(raw_token.strip())
    row = (
        db.query(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .filter(
            Application.placement_employer_attest_token_hash == digest,
            Application.placement_employer_attest_expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not row:
        return None
    _app, job = row
    return {"company_name": job.company, "job_title": job.title}


def confirm_employer_attestation(db: Session, raw_token: str) -> tuple[bool, str]:
    """Employer one-click confirm — marks placement verified without work-email magic link."""
    if not raw_token.strip():
        return False, "Missing token."
    digest = hash_placement_token(raw_token.strip())
    app = (
        db.query(Application)
        .filter(
            Application.placement_employer_attest_token_hash == digest,
            Application.placement_employer_attest_expires_at > datetime.now(timezone.utc),
        )
        .first()
    )
    if not app:
        return False, "Invalid or expired employer attestation link."
    if app.placement_state == PLACEMENT_VERIFIED:
        return True, "Placement already verified."

    now = datetime.now(timezone.utc)
    app.placement_verified_at = now
    app.placement_state = PLACEMENT_VERIFIED
    app.placement_employer_attest_token_hash = None
    app.placement_employer_attest_expires_at = None
    promoted = app.status != ApplicationStatus.HIRED
    if promoted:
        app.status = ApplicationStatus.HIRED
    record_placement_event(
        db,
        application_id=app.id,
        event_type="placement.employer_attested",
        actor="employer",
        detail={"promoted_to_hired": promoted},
        from_magic_link=True,
    )
    db.commit()
    return True, "Placement confirmed by employer. Thank you."


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
        from_magic_link=True,
    )
    db.commit()
    return True, "Placement verified. Thank you."
