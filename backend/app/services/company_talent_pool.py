"""Company talent pool — executive summary over recruiter internal pool data."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterTalentPoolImport, RecruiterTalentPoolRecord
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_talent_pool import build_recruiter_talent_pool


def _parse_json(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def _warning_dimension_counts(records: list[RecruiterTalentPoolRecord]) -> dict[str, int]:
    dims: Counter[str] = Counter()
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=180)
    for rec in records:
        quality = _parse_json(rec.data_quality_json, {})
        warnings = quality.get("warnings") or []
        if "missing_job_title" in warnings:
            dims["missing_role_title"] += 1
        if "missing_skills" in warnings:
            dims["missing_skills"] += 1
        if not rec.candidate_id:
            dims["missing_consent"] += 1
        created = rec.created_at
        if created:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created < stale_cutoff:
                dims["stale_records"] += 1
    return dict(dims)


def build_company_talent_pool(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
    limit: int = 50,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    pl = locale.lower().startswith("pl")
    base = build_recruiter_talent_pool(db, company_slug=slug, locale=locale, limit=limit)

    all_records = (
        db.query(RecruiterTalentPoolRecord)
        .filter(RecruiterTalentPoolRecord.company_slug == slug)
        .all()
    )
    imports = (
        db.query(RecruiterTalentPoolImport)
        .filter(RecruiterTalentPoolImport.company_slug == slug)
        .all()
    )

    known = sum(1 for r in all_records if r.candidate_id or r.application_id)
    imported = len(all_records)
    radar_ready = sum(
        1
        for r in all_records
        if str(_parse_json(r.data_quality_json, {}).get("level") or "") == "high"
    )
    data_gaps = sum(
        1
        for r in all_records
        if (_parse_json(r.data_quality_json, {}).get("warnings") or [])
        or str(_parse_json(r.data_quality_json, {}).get("level") or "") in {"low", "medium"}
    )
    potential_duplicates = sum(i.duplicate_count or 0 for i in imports)
    import_sources = {i.import_source for i in imports if i.status == "committed"}
    active_sources = len(import_sources)

    dimensions = _warning_dimension_counts(all_records)
    dimensions["duplicates"] = potential_duplicates

    applications_linked = sum(1 for r in all_records if r.application_id)
    inbox_linked = sum(1 for r in all_records if r.pipeline_status)

    return {
        **base,
        "source": "workspace",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "executive_summary": {
            "known_candidates": known,
            "imported_candidates": imported,
            "radar_ready": radar_ready,
            "data_gaps": data_gaps,
            "potential_duplicates": potential_duplicates,
            "active_sources": active_sources,
            "planned_sources": 2,
        },
        "data_quality": {
            **base["data_quality"],
            "dimensions": dimensions,
        },
        "source_coverage": {
            **base["source_coverage"],
            "applications": applications_linked,
            "inbox": inbox_linked,
            "scorecards": 0,
            "notes": 0,
            "import_pool": imported,
            "ats_connectors_planned": True,
        },
        "links": {
            "recruiter_import": "/recruiter/talent-pool/import",
            "integrations": "/company/integrations",
            "pipeline": "/company/pipeline",
            "recruiter_pool": "/recruiter/talent-pool",
        },
        "scope_note": (
            "Pamięć talentów firmy — dane wewnętrzne, bez live sync ATS i bez automatycznego outreachu."
            if pl
            else "Company talent memory — internal data only, no live ATS sync or automatic outreach."
        ),
    }
