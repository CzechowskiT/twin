"""Recruiter talent pool — list, summarize quality, source coverage."""

from __future__ import annotations

import json
from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterTalentPoolImport, RecruiterTalentPoolRecord
from app.services.recruiter_inbox import _require_company_slug


def _parse_json(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def build_recruiter_talent_pool(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    pl = locale.lower().startswith("pl")
    cap = max(1, min(limit, 100))

    records = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.archived_at.is_(None),
        )
        .order_by(RecruiterTalentPoolRecord.created_at.desc())
        .limit(cap)
        .all()
    )
    total = (
        db.query(RecruiterTalentPoolRecord)
        .filter(
            RecruiterTalentPoolRecord.company_slug == slug,
            RecruiterTalentPoolRecord.archived_at.is_(None),
        )
        .count()
    )
    imports = (
        db.query(RecruiterTalentPoolImport)
        .filter(RecruiterTalentPoolImport.company_slug == slug)
        .order_by(RecruiterTalentPoolImport.created_at.desc())
        .limit(10)
        .all()
    )

    quality_levels: Counter[str] = Counter()
    source_counts: Counter[str] = Counter()
    warning_counts: Counter[str] = Counter()
    items: list[dict[str, Any]] = []

    for rec in records:
        quality = _parse_json(rec.data_quality_json, {})
        level = str(quality.get("level") or "unknown")
        quality_levels[level] += 1
        for w in quality.get("warnings") or []:
            warning_counts[str(w)] += 1
        skills = _parse_json(rec.skills_json, [])
        source_counts["imported_internal_pool"] += 1
        items.append(
            {
                "id": rec.id,
                "display_name": rec.display_name,
                "job_title": rec.job_title,
                "location": rec.location,
                "seniority": rec.seniority,
                "skills": skills if isinstance(skills, list) else [],
                "data_quality": quality,
                "external_ats_id": rec.external_ats_id,
                "candidate_id": rec.candidate_id,
                "application_id": rec.application_id,
                "pipeline_status": rec.pipeline_status,
                "source": rec.source_type or "imported_internal_pool",
                "source_type": rec.source_type or "csv_import",
                "consent_visibility": rec.consent_visibility or "unknown",
                "archived": rec.archived_at is not None,
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
            }
        )

    import_sources = Counter(i.import_source for i in imports)
    last_import = imports[0] if imports else None

    return {
        "company_slug": slug,
        "summary": {
            "total_records": total,
            "shown": len(items),
            "quality_high": quality_levels.get("high", 0),
            "quality_medium": quality_levels.get("medium", 0),
            "quality_low": quality_levels.get("low", 0),
            "import_batches": len(imports),
            "last_import_at": last_import.created_at.isoformat() if last_import and last_import.created_at else None,
            "last_import_status": last_import.status if last_import else None,
        },
        "data_quality": {
            "levels": dict(quality_levels),
            "top_warnings": [{"code": k, "count": v} for k, v in warning_counts.most_common(5)],
        },
        "source_coverage": {
            "imported_internal_pool": total,
            "import_sources": dict(import_sources),
            "external_sourcing": False,
            "live_ats_sync": False,
        },
        "items": items,
        "scope_note": (
            "Wewnętrzny pool strukturalny — import CSV, bez live sync ATS."
            if pl
            else "Structured internal pool — CSV import, no live ATS sync."
        ),
    }


def list_talent_pool_records_for_radar(
    db: Session,
    *,
    company_slug: str,
    limit: int = 50,
) -> list[RecruiterTalentPoolRecord]:
    slug = _require_company_slug(company_slug)
    return (
        db.query(RecruiterTalentPoolRecord)
        .filter(RecruiterTalentPoolRecord.company_slug == slug)
        .order_by(RecruiterTalentPoolRecord.created_at.desc())
        .limit(limit)
        .all()
    )
