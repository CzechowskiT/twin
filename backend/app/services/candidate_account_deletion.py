"""Candidate self-service account deletion — anonymize PII, deactivate user (R-019)."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, CandidatePrivacyRequest, User
from app.services.candidate_privacy_request_service import create_privacy_request
from app.services.candidate_trust_audit_service import record_trust_audit_event

DELETE_CONFIRMATION_PHRASE = "DELETE"
ANONYMIZED_EMAIL_DOMAIN = "anonymized.twin"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _anonymized_email(user_id: int) -> str:
    suffix = secrets.token_hex(4)
    return f"deleted-{user_id}-{suffix}@{ANONYMIZED_EMAIL_DOMAIN}"


def _anonymize_candidate(candidate: Candidate) -> None:
    candidate.name = "Deleted User"
    candidate.skills = "[]"
    candidate.preferred_job_titles = "[]"
    candidate.desired_salary = None
    candidate.location = None
    candidate.resume_path = None
    candidate.cv_text = None
    candidate.cv_filename = None
    candidate.cv_uploaded_at = None
    candidate.intro_audio_path = None
    candidate.intro_audio_uploaded_at = None
    candidate.intro_audio_transcript = None
    candidate.profile_signals_json = None
    candidate.talent_pool_opt_in = False
    candidate.talent_pool_opt_in_at = None
    candidate.cv_processing_consent_at = None
    candidate.intro_audio_processing_consent_at = None


def _anonymize_user(user: User) -> None:
    user.email = _anonymized_email(user.id)
    user.hashed_password = None
    user.linkedin_id = None
    user.is_active = False
    user.marketing_emails_opt_in = False
    user.referral_public_token = None
    user.billing_company_name = None
    user.billing_tax_id = None
    user.stripe_customer_id = None
    user.stripe_subscription_id = None
    user.subscription_status = None
    user.webcal_feed_token_hash = None
    user.webcal_feed_token_expires_at = None
    user.signup_referred_by_note = None


def execute_candidate_account_deletion(
    db: Session,
    *,
    user: User,
    candidate: Candidate,
    confirmation: str,
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    if confirmation.strip() != DELETE_CONFIRMATION_PHRASE:
        raise ValueError(f"Confirmation must be exactly '{DELETE_CONFIRMATION_PHRASE}'")
    if not user.is_active:
        raise ValueError("Account already deleted or inactive")

    held = (
        db.query(CandidatePrivacyRequest)
        .filter(
            CandidatePrivacyRequest.candidate_id == candidate.id,
            CandidatePrivacyRequest.legal_hold.is_(True),
        )
        .first()
    )
    if held is not None:
        raise ValueError("legal_hold_blocks_self_service_deletion")

    deleted_at = _utcnow()
    _anonymize_candidate(candidate)
    _anonymize_user(user)

    privacy = create_privacy_request(
        db,
        candidate_id=candidate.id,
        user_id=user.id,
        request_type="deletion",
        payload={"self_service": True, "deleted_at": deleted_at.isoformat()},
        idempotency_key=idempotency_key,
    )
    pr_row = db.query(CandidatePrivacyRequest).filter(CandidatePrivacyRequest.id == privacy["id"]).first()
    if pr_row:
        pr_row.status = "completed"
        pr_row.completed_at = deleted_at
        pr_row.updated_at = deleted_at

    record_trust_audit_event(
        db,
        candidate_id=candidate.id,
        event_type="account_deleted",
        summary="Candidate self-service account deletion completed",
        metadata={"privacy_request_id": privacy["id"], "self_service": True},
        actor="candidate",
        actor_user_id=user.id,
    )
    db.commit()

    return {
        "deleted": True,
        "deleted_at": deleted_at,
        "privacy_request_id": privacy["id"],
        "message": "Account anonymized and deactivated. Sign-in is no longer possible.",
    }
