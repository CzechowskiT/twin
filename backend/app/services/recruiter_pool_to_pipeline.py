"""Bridge talent-pool records into recruiter inbox Applications (tenant-scoped).

Creates privacy-safe synthetic User+Candidate rows only when needed so CSV/manual
imports can enter the accept/decline pipeline. Never creates real login credentials.
"""

from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    ApplicationStatus,
    Candidate,
    Job,
    RecruiterTalentPoolRecord,
    SubmissionStatus,
    User,
)
from app.services.recruiter_audit_trail import log_recruiter_audit_event
from app.services.recruiter_inbox import _require_company_slug
from app.utils.slug import slugify_company

# Unusable password hash sentinel — these users cannot authenticate.
_SYNTHETIC_PASSWORD_SENTINEL = "!" + "twin-synthetic-no-login"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _job_for_company(db: Session, *, company_slug: str, job_id: int) -> Job:
    slug = _require_company_slug(company_slug)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise ValueError("Role/job not found.")
    if slugify_company(job.company or "") != slug:
        raise ValueError("Role does not belong to this company.")
    return job


def _ensure_synthetic_candidate(
    db: Session,
    *,
    company_slug: str,
    display_name: str,
    location: str | None,
    skills: list[str],
    external_key: str,
) -> Candidate:
    slug = _require_company_slug(company_slug)
    digest = hashlib.sha256(f"{slug}|{external_key}".encode()).hexdigest()[:24]
    email = f"synthetic+{slug}.{digest}@invalid.twin.local"
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user and existing_user.candidate:
        return existing_user.candidate
    if existing_user:
        cand = Candidate(
            user_id=existing_user.id,
            name=display_name.strip()[:200] or "Candidate",
            skills=json.dumps(skills[:20]),
            preferred_job_titles="[]",
            location=(location or "").strip()[:100] or None,
            talent_pool_opt_in=True,
            talent_pool_opt_in_at=_utcnow(),
        )
        db.add(cand)
        db.flush()
        return cand
    user = User(
        email=email,
        hashed_password=_SYNTHETIC_PASSWORD_SENTINEL,
        gdpr_consent_at=_utcnow(),
        exclude_from_product_metrics=True,
        is_active=False,
    )
    db.add(user)
    db.flush()
    cand = Candidate(
        user_id=user.id,
        name=display_name.strip()[:200] or "Candidate",
        skills=json.dumps(skills[:20]),
        preferred_job_titles="[]",
        location=(location or "").strip()[:100] or None,
        talent_pool_opt_in=True,
        talent_pool_opt_in_at=_utcnow(),
    )
    db.add(cand)
    db.flush()
    return cand


def assign_pool_record_to_role(
    db: Session,
    *,
    company_slug: str,
    record_id: int,
    job_id: int,
) -> dict[str, Any]:
    """Create (or reuse) an APPLIED Application for a talent-pool record + company role."""
    slug = _require_company_slug(company_slug)
    record = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.id == record_id,
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.archived_at.is_(None),
        )
        .first()
    )
    if not record:
        raise ValueError("Talent pool record not found.")
    job = _job_for_company(db, company_slug=slug, job_id=job_id)

    if record.application_id:
        existing = db.query(Application).filter(Application.id == record.application_id).first()
        if existing and existing.job_id == job.id:
            return {
                "record_id": record.id,
                "application_id": existing.id,
                "job_id": job.id,
                "status": existing.status.value,
                "created": False,
                "synthetic_tenant": True,
            }

    skills: list[str] = []
    if record.skills_json:
        try:
            loaded = json.loads(record.skills_json)
            if isinstance(loaded, list):
                skills = [str(s) for s in loaded if str(s).strip()]
        except json.JSONDecodeError:
            skills = []

    external_key = (
        (record.external_ats_id or "").strip()
        or (record.duplicate_key or "").strip()
        or f"record-{record.id}"
    )
    cand = _ensure_synthetic_candidate(
        db,
        company_slug=slug,
        display_name=record.display_name,
        location=record.location,
        skills=skills,
        external_key=external_key,
    )

    # Avoid duplicate applications for same candidate+job
    dup = (
        db.query(Application)
        .filter(Application.candidate_id == cand.id, Application.job_id == job.id)
        .first()
    )
    if dup:
        record.application_id = dup.id
        record.job_id = job.id
        record.pipeline_status = record.pipeline_status or "review"
        record.updated_at = _utcnow()
        db.add(record)
        db.commit()
        return {
            "record_id": record.id,
            "application_id": dup.id,
            "job_id": job.id,
            "status": dup.status.value,
            "created": False,
            "synthetic_tenant": True,
        }

    now = _utcnow()
    app_row = Application(
        candidate_id=cand.id,
        job_id=job.id,
        status=ApplicationStatus.APPLIED,
        applied_at=now,
        updated_at=now,
        application_method="recruiter_pool_assign",
        submission_status=SubmissionStatus.APPLICATION_CREATED_IN_TWIN,
        recruiter_pipeline_status="review",
        external_ats_id=(record.external_ats_id or None),
        notes=f"synthetic_pool_record:{record.id}",
    )
    db.add(app_row)
    db.flush()
    record.application_id = app_row.id
    record.job_id = job.id
    record.pipeline_status = "review"
    record.updated_at = now
    db.add(record)
    db.commit()
    db.refresh(app_row)

    log_recruiter_audit_event(
        db,
        application_id=app_row.id,
        company_slug=slug,
        action_type="pool_assigned_to_role",
        meta={
            "record_id": str(record.id),
            "job_id": str(job.id),
            "source": "talent_pool_assign",
            "synthetic": "true",
        },
    )
    return {
        "record_id": record.id,
        "application_id": app_row.id,
        "job_id": job.id,
        "status": app_row.status.value,
        "created": True,
        "synthetic_tenant": True,
        "candidate_name": cand.name,
    }


def create_manual_candidate_for_role(
    db: Session,
    *,
    company_slug: str,
    job_id: int,
    display_name: str,
    job_title: str | None = None,
    location: str | None = None,
    seniority: str | None = None,
    skills: list[str] | None = None,
    external_ats_id: str | None = None,
) -> dict[str, Any]:
    """Manual add + immediate assign to role (single API step for pilot journey)."""
    from app.services.recruiter_talent_pool_persistence import add_talent_pool_record

    slug = _require_company_slug(company_slug)
    _job_for_company(db, company_slug=slug, job_id=job_id)
    added = add_talent_pool_record(
        db,
        company_slug=slug,
        display_name=display_name,
        job_title=job_title,
        location=location,
        seniority=seniority,
        skills=skills,
        external_ats_id=external_ats_id or f"manual-{secrets.token_hex(4)}",
        pipeline_status="review",
    )
    record_id = int(added["record"]["id"])
    linked = assign_pool_record_to_role(
        db, company_slug=slug, record_id=record_id, job_id=job_id
    )
    return {
        "pool": added,
        "application": linked,
        "synthetic_tenant": True,
    }


def commit_import_and_assign(
    db: Session,
    *,
    company_slug: str,
    import_id: int,
    job_id: int,
) -> dict[str, Any]:
    """Commit CSV import then assign all new records to a company role."""
    from app.services.recruiter_talent_pool_import import commit_talent_pool_import

    slug = _require_company_slug(company_slug)
    _job_for_company(db, company_slug=slug, job_id=job_id)
    committed = commit_talent_pool_import(db, company_slug=slug, import_id=import_id)
    records = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.import_id == import_id,
            RecruiterTalentPoolRecord.archived_at.is_(None),
        )
        .all()
    )
    assigned: list[dict[str, Any]] = []
    for rec in records:
        try:
            assigned.append(
                assign_pool_record_to_role(
                    db, company_slug=slug, record_id=rec.id, job_id=job_id
                )
            )
        except ValueError as exc:
            assigned.append({"record_id": rec.id, "error": str(exc), "created": False})
    return {
        "import": committed,
        "job_id": job_id,
        "assigned": assigned,
        "assigned_count": sum(1 for a in assigned if a.get("application_id")),
        "synthetic_tenant": True,
    }
