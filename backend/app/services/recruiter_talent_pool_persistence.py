"""Recruiter talent pool persistence — manual add, filter, detail, archive."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, RecruiterTalentPoolRecord
from app.services.recruiter_inbox import _require_company_slug

SOURCE_TYPES = frozenset({"csv_import", "manual_add", "candidate_link"})
CONSENT_VISIBILITY = frozenset({"visible", "hidden", "revoked", "deleted", "unknown"})
_FORBIDDEN_SNAPSHOT_KEYS = frozenset(
    {"email", "phone", "phone_number", "cv_text", "cv_raw", "linkedin", "hashed_password"}
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _duplicate_key(company_slug: str, *, display_name: str, external_ats_id: str = "", candidate_id: str = "") -> str:
    parts = [
        company_slug,
        display_name.strip().lower(),
        external_ats_id.strip().lower(),
        candidate_id.strip().lower(),
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:64]


def _data_quality(*, skills: list[str], job_title: str | None, location: str | None) -> dict[str, Any]:
    warnings: list[str] = []
    score = 100
    if not skills:
        warnings.append("missing_skills")
        score -= 25
    if not job_title:
        warnings.append("missing_job_title")
        score -= 15
    if not location:
        warnings.append("missing_location")
        score -= 10
    level = "high" if score >= 80 else "medium" if score >= 50 else "low"
    return {"score": score, "level": level, "warnings": warnings}


def _sanitize_snapshot(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw:
        return {}
    clean: dict[str, Any] = {}
    for key, value in raw.items():
        if key.lower() in _FORBIDDEN_SNAPSHOT_KEYS:
            continue
        if isinstance(value, str) and "@" in value:
            continue
        clean[key] = value
    return clean


def build_privacy_safe_snapshot(
    db: Session,
    *,
    candidate_id: str | None = None,
    display_name: str | None = None,
    job_title: str | None = None,
    location: str | None = None,
    skills: list[str] | None = None,
) -> dict[str, Any]:
    """Consent-safe snapshot — no email, phone, or CV text."""
    snapshot: dict[str, Any] = {
        "display_name": (display_name or "").strip()[:200],
        "job_title": (job_title or "").strip()[:200] or None,
        "location": (location or "").strip()[:120] or None,
        "skills": (skills or [])[:20],
        "consent_visibility": "unknown",
    }
    if candidate_id:
        cand = (
            db.query(Candidate)
            .filter(Candidate.id == int(candidate_id))
            .first()
            if candidate_id.isdigit()
            else None
        )
        if cand:
            if not cand.talent_pool_opt_in:
                snapshot["consent_visibility"] = "hidden"
            elif cand.talent_pool_opt_in:
                snapshot["consent_visibility"] = "visible"
            if not snapshot["display_name"]:
                snapshot["display_name"] = (cand.name or "")[:200]
            if not snapshot["location"]:
                snapshot["location"] = cand.location
            if not snapshot["skills"]:
                try:
                    parsed = json.loads(cand.skills or "[]")
                    snapshot["skills"] = parsed if isinstance(parsed, list) else []
                except json.JSONDecodeError:
                    snapshot["skills"] = []
    return _sanitize_snapshot(snapshot)


def _serialize_record(row: RecruiterTalentPoolRecord) -> dict[str, Any]:
    skills = json.loads(row.skills_json) if row.skills_json else []
    quality = json.loads(row.data_quality_json) if row.data_quality_json else {}
    snapshot = json.loads(row.snapshot_json) if row.snapshot_json else None
    return {
        "id": row.id,
        "display_name": row.display_name,
        "job_title": row.job_title,
        "location": row.location,
        "seniority": row.seniority,
        "skills": skills if isinstance(skills, list) else [],
        "data_quality": quality if isinstance(quality, dict) else {},
        "external_ats_id": row.external_ats_id,
        "candidate_id": row.candidate_id,
        "application_id": row.application_id,
        "pipeline_status": row.pipeline_status,
        "source_type": row.source_type or "csv_import",
        "source": row.source_type or "csv_import",
        "snapshot": snapshot,
        "consent_visibility": row.consent_visibility or "unknown",
        "archived": row.archived_at is not None,
        "archived_at": row.archived_at.isoformat() if row.archived_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def list_talent_pool_records(
    db: Session,
    *,
    company_slug: str,
    limit: int = 50,
    offset: int = 0,
    include_archived: bool = False,
    source_type: str | None = None,
    pipeline_status: str | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    cap = max(1, min(limit, 100))
    off = max(0, offset)
    q = db.query(RecruiterTalentPoolRecord).filter(RecruiterTalentPoolRecord.company_slug == slug)
    if not include_archived:
        q = q.filter(RecruiterTalentPoolRecord.archived_at.is_(None))
    if source_type:
        q = q.filter(RecruiterTalentPoolRecord.source_type == source_type.strip())
    if pipeline_status:
        q = q.filter(RecruiterTalentPoolRecord.pipeline_status == pipeline_status.strip())
    if search:
        term = f"%{search.strip()[:80]}%"
        q = q.filter(RecruiterTalentPoolRecord.display_name.ilike(term))
    total = q.count()
    rows = q.order_by(RecruiterTalentPoolRecord.created_at.desc()).offset(off).limit(cap).all()
    return {
        "company_slug": slug,
        "total": total,
        "offset": off,
        "limit": cap,
        "items": [_serialize_record(r) for r in rows],
    }


def get_talent_pool_record(db: Session, *, company_slug: str, record_id: int) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.id == record_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Talent pool record not found.")
    return _serialize_record(row)


def add_talent_pool_record(
    db: Session,
    *,
    company_slug: str,
    display_name: str,
    job_title: str | None = None,
    location: str | None = None,
    seniority: str | None = None,
    skills: list[str] | None = None,
    external_ats_id: str | None = None,
    candidate_id: str | None = None,
    pipeline_status: str | None = "review",
    idempotency_key: str | None = None,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    name = display_name.strip()
    if not name:
        raise ValueError("display_name is required.")
    if re.search(r"@|\d{3}.*\d{3}.*\d", name):
        raise ValueError("display_name must not contain email or phone patterns.")
    skill_list = [s.strip() for s in (skills or []) if s.strip()][:20]
    dup = _duplicate_key(
        slug,
        display_name=name,
        external_ats_id=external_ats_id or "",
        candidate_id=candidate_id or idempotency_key or "",
    )
    existing = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.duplicate_key == dup,
            RecruiterTalentPoolRecord.archived_at.is_(None),
        )
        .first()
    )
    if existing:
        return {"record": _serialize_record(existing), "duplicate": True}
    snapshot = build_privacy_safe_snapshot(
        db,
        candidate_id=candidate_id,
        display_name=name,
        job_title=job_title,
        location=location,
        skills=skill_list,
    )
    consent = str(snapshot.get("consent_visibility") or "unknown")
    if consent == "hidden":
        raise ValueError("Candidate has not opted in to talent pool visibility.")
    quality = _data_quality(skills=skill_list, job_title=job_title, location=location)
    now = _utcnow()
    row = RecruiterTalentPoolRecord(
        company_slug=slug,
        display_name=name[:200],
        job_title=(job_title or "").strip()[:200] or None,
        location=(location or "").strip()[:120] or None,
        seniority=(seniority or "").strip()[:64] or None,
        skills_json=json.dumps(skill_list),
        data_quality_json=json.dumps(quality),
        external_ats_id=(external_ats_id or "").strip()[:128] or None,
        candidate_id=(candidate_id or "").strip()[:64] or None,
        pipeline_status=(pipeline_status or "review").strip()[:32],
        duplicate_key=dup,
        source_type="manual_add",
        snapshot_json=json.dumps(snapshot),
        consent_visibility=consent,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"record": _serialize_record(row), "duplicate": False}


def archive_talent_pool_record(db: Session, *, company_slug: str, record_id: int) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    row = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.id == record_id,
        )
        .first()
    )
    if not row:
        raise ValueError("Talent pool record not found.")
    if row.archived_at is None:
        now = _utcnow()
        row.archived_at = now
        row.updated_at = now
        db.add(row)
        db.commit()
        db.refresh(row)
    return _serialize_record(row)
