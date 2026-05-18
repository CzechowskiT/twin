"""Assemble user-owned records for GDPR-style JSON export (no secrets)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    Candidate,
    IdentityVerification,
    Job,
    OAuthAccount,
    ScheduledInterview,
    User,
    UserGoogleCalendar,
)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.isoformat()


def build_user_owned_export_payload(
    *,
    db: Session,
    user: User,
    dashboard_url: str,
) -> dict[str, Any]:
    """Return a JSON-serializable dict of the signed-in user's data (passwords and OAuth refresh tokens omitted)."""
    candidate = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    gcal = db.query(UserGoogleCalendar).filter(UserGoogleCalendar.user_id == user.id).first()

    user_out: dict[str, Any] = {
        "id": user.id,
        "email": user.email,
        "linkedin_id": user.linkedin_id,
        "is_active": user.is_active,
        "gdpr_consent_at": _iso(user.gdpr_consent_at),
        "marketing_emails_opt_in": user.marketing_emails_opt_in,
        "marketing_emails_opt_in_at": _iso(user.marketing_emails_opt_in_at),
        "terms_of_service_accepted_at": _iso(user.terms_of_service_accepted_at),
        "job_data_processing_consent_at": _iso(user.job_data_processing_consent_at),
        "ai_matching_consent_at": _iso(user.ai_matching_consent_at),
        "identity_provider_processing_consent_at": _iso(user.identity_provider_processing_consent_at),
        "created_at": _iso(user.created_at),
        "plan_tier": user.plan_tier,
        "subscription_status": user.subscription_status,
        "subscription_current_period_end": _iso(user.subscription_current_period_end),
        "identity_verified_at": _iso(user.identity_verified_at),
        "signup_referred_by_note": user.signup_referred_by_note,
        "signup_referrer_user_id": user.signup_referrer_user_id,
        "signup_utm_source": user.signup_utm_source,
        "signup_utm_medium": user.signup_utm_medium,
        "signup_utm_campaign": user.signup_utm_campaign,
        "signup_utm_content": user.signup_utm_content,
        "subscription_invoice_payment_count": user.subscription_invoice_payment_count,
    }

    cand_out: dict[str, Any] | None = None
    if candidate:
        cand_out = {
            "id": candidate.id,
            "name": candidate.name,
            "skills": candidate.skills,
            "experience_years": candidate.experience_years,
            "desired_salary": candidate.desired_salary,
            "location": candidate.location,
            "resume_path": candidate.resume_path,
            "cv_text": candidate.cv_text,
            "cv_filename": candidate.cv_filename,
            "cv_uploaded_at": _iso(candidate.cv_uploaded_at),
            "preferred_job_titles": candidate.preferred_job_titles,
            "intro_audio_path": candidate.intro_audio_path,
            "intro_audio_uploaded_at": _iso(candidate.intro_audio_uploaded_at),
            "intro_audio_transcript": candidate.intro_audio_transcript,
            "profile_signals_json": candidate.profile_signals_json,
            "talent_pool_opt_in": candidate.talent_pool_opt_in,
            "talent_pool_opt_in_at": _iso(candidate.talent_pool_opt_in_at),
            "cv_processing_consent_at": _iso(candidate.cv_processing_consent_at),
            "intro_audio_processing_consent_at": _iso(candidate.intro_audio_processing_consent_at),
            "created_at": _iso(candidate.created_at),
        }

    applications_out: list[dict[str, Any]] = []
    applications_summary: dict[str, Any] = {"total": 0, "by_status": {}, "applications": []}
    if candidate:
        rows = (
            db.query(Application, Job)
            .join(Job, Application.job_id == Job.id)
            .filter(Application.candidate_id == candidate.id)
            .order_by(Application.updated_at.desc())
            .all()
        )
        by_status: dict[str, int] = {}
        summary_rows: list[dict[str, Any]] = []
        for app, job in rows:
            st = getattr(app.status, "value", str(app.status))
            by_status[st] = by_status.get(st, 0) + 1
            applications_out.append(
                {
                    "id": app.id,
                    "job_id": app.job_id,
                    "status": st,
                    "notes": app.notes,
                    "recruiter_feedback_raw": app.recruiter_feedback_raw,
                    "feedback_insights_json": app.feedback_insights_json,
                    "applied_at": _iso(app.applied_at),
                    "updated_at": _iso(app.updated_at),
                    "placement_state": app.placement_state,
                    "placement_reported_at": _iso(app.placement_reported_at),
                    "placement_work_email": app.placement_work_email,
                    "placement_verified_at": _iso(app.placement_verified_at),
                    "placement_declaration_note": app.placement_declaration_note,
                },
            )
            summary_rows.append(
                {
                    "application_id": app.id,
                    "job_id": job.id,
                    "status": st,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location or "",
                    "job_board": job.job_board,
                    "url": job.url,
                    "applied_at": _iso(app.applied_at),
                    "updated_at": _iso(app.updated_at),
                    "notes": app.notes,
                    "placement_state": app.placement_state or "none",
                    "placement_verified_at": _iso(app.placement_verified_at),
                },
            )
        applications_summary = {"total": len(rows), "by_status": by_status, "applications": summary_rows}

    interviews_out: list[dict[str, Any]] = []
    for inv in db.query(ScheduledInterview).filter(ScheduledInterview.user_id == user.id).order_by(ScheduledInterview.id).all():
        interviews_out.append(
            {
                "id": inv.id,
                "application_id": inv.application_id,
                "company_name": inv.company_name,
                "job_title": inv.job_title,
                "interviewer_name": inv.interviewer_name,
                "interviewer_email": inv.interviewer_email,
                "interview_start": _iso(inv.interview_start),
                "interview_end": _iso(inv.interview_end),
                "timezone": inv.timezone,
                "calendar_event_id": inv.calendar_event_id,
                "calendar_provider": inv.calendar_provider,
                "meeting_link": inv.meeting_link,
                "meeting_location": inv.meeting_location,
                "interview_type": inv.interview_type,
                "status": inv.status,
                "notes": inv.notes,
                "created_at": _iso(inv.created_at),
                "updated_at": _iso(inv.updated_at),
            }
        )

    idv_out: list[dict[str, Any]] = []
    for row in db.query(IdentityVerification).filter(IdentityVerification.user_id == user.id).order_by(IdentityVerification.id).all():
        idv_out.append(
            {
                "id": row.id,
                "provider": row.provider,
                "conversation_id": row.conversation_id,
                "user_key": row.user_key,
                "conversation_status": row.conversation_status,
                "identity_status": row.identity_status,
                "redirect_url": row.redirect_url,
                "summary_json": row.summary_json,
                "created_at": _iso(row.created_at),
                "updated_at": _iso(row.updated_at),
            }
        )

    oauth_out: list[dict[str, Any]] = []
    for ac in db.query(OAuthAccount).filter(OAuthAccount.user_id == user.id).order_by(OAuthAccount.id).all():
        oauth_out.append(
            {
                "id": ac.id,
                "provider": ac.provider,
                "subject": ac.subject,
                "created_at": _iso(ac.created_at),
            }
        )

    gcal_out: dict[str, Any] | None = None
    if gcal:
        gcal_out = {"connected": True, "google_email": gcal.google_email, "created_at": _iso(gcal.created_at)}
    else:
        gcal_out = {"connected": False, "google_email": None}

    return {
        "export_schema_version": 1,
        "dashboard_url": dashboard_url,
        "user": user_out,
        "candidate": cand_out,
        "applications": applications_out,
        "applications_summary": applications_summary,
        "scheduled_interviews": interviews_out,
        "identity_verifications": idv_out,
        "oauth_accounts": oauth_out,
        "google_calendar": gcal_out,
    }
