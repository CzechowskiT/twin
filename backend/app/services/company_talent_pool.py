"""Company talent pool — executive summary over recruiter internal pool data."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.database.models import RecruiterTalentPoolImport, RecruiterTalentPoolRecord
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_jobs import list_company_jobs
from app.services.recruiter_talent_pool import build_recruiter_talent_pool

ReadinessState = Literal[
    "ready",
    "needs_enrichment",
    "duplicate_review",
    "consent_required",
    "stale",
]
_STALE_DAYS = 180
_WEAK_ROLE_MIN = 2


def _parse_json(raw: str | None, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def _record_stale(created: datetime | None, cutoff: datetime) -> bool:
    if not created:
        return False
    aware = created if created.tzinfo else created.replace(tzinfo=timezone.utc)
    return aware < cutoff


def _warning_dimension_counts(records: list[RecruiterTalentPoolRecord]) -> dict[str, int]:
    dims: Counter[str] = Counter()
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=_STALE_DAYS)
    for rec in records:
        quality = _parse_json(rec.data_quality_json, {})
        warnings = quality.get("warnings") or []
        if "missing_job_title" in warnings:
            dims["missing_role_title"] += 1
        if "missing_skills" in warnings:
            dims["missing_skills"] += 1
        if "missing_location" in warnings:
            dims["missing_location"] += 1
        if not (rec.seniority or "").strip():
            dims["missing_seniority"] += 1
        if not rec.candidate_id:
            dims["missing_consent"] += 1
        level = str(quality.get("level") or "")
        if level == "low" or "missing_external_ref" in warnings:
            dims["low_evidence"] += 1
        if _record_stale(rec.created_at, stale_cutoff):
            dims["stale_records"] += 1
    return dict(dims)


def _duplicate_keys(records: list[RecruiterTalentPoolRecord]) -> set[str]:
    counts: Counter[str] = Counter()
    for rec in records:
        key = (rec.duplicate_key or "").strip()
        if key:
            counts[key] += 1
    return {k for k, v in counts.items() if v > 1}


def _readiness_state(
    rec: RecruiterTalentPoolRecord,
    *,
    duplicate_keys: set[str],
    stale_cutoff: datetime,
) -> ReadinessState:
    if _record_stale(rec.created_at, stale_cutoff):
        return "stale"
    dup_key = (rec.duplicate_key or "").strip()
    if dup_key and dup_key in duplicate_keys:
        return "duplicate_review"
    if not rec.candidate_id and not rec.application_id:
        return "consent_required"
    quality = _parse_json(rec.data_quality_json, {})
    level = str(quality.get("level") or "")
    warnings = quality.get("warnings") or []
    if level in {"low", "medium"} or warnings:
        return "needs_enrichment"
    return "ready"


def _role_title_map(jobs: list[dict]) -> dict[str, int]:
    return {
        str(j.get("title") or "").strip().lower(): int(j["id"])
        for j in jobs
        if j.get("title") and j.get("id") is not None
    }


def _build_role_skill_coverage(
    records: list[RecruiterTalentPoolRecord],
    *,
    role_title_to_job_id: dict[str, int],
    locale: str,
) -> dict[str, Any]:
    pl = locale.lower().startswith("pl")
    role_counts: Counter[str] = Counter()
    skill_counts: Counter[str] = Counter()
    role_gap_counts: Counter[str] = Counter()

    for rec in records:
        title = (rec.job_title or "").strip() or ("Bez roli" if pl else "No role")
        role_counts[title] += 1
        quality = _parse_json(rec.data_quality_json, {})
        warnings = quality.get("warnings") or []
        if "missing_skills" in warnings or "missing_job_title" in warnings:
            role_gap_counts[title] += 1
        for skill in _parse_json(rec.skills_json, []):
            if isinstance(skill, str) and skill.strip():
                skill_counts[skill.strip()] += 1

    top_roles = [
        {"title": title, "count": count}
        for title, count in role_counts.most_common(5)
    ]
    top_skills = [
        {"skill": skill, "count": count}
        for skill, count in skill_counts.most_common(8)
    ]

    weak_coverage: list[dict[str, Any]] = []
    for title, count in role_counts.most_common():
        gaps = role_gap_counts.get(title, 0)
        if count >= _WEAK_ROLE_MIN and gaps < count // 2:
            continue
        warning = (
            "Mało kandydatów w poolu dla tej roli"
            if count < _WEAK_ROLE_MIN
            else "Wiele rekordów wymaga wzbogacenia danych"
        )
        if not pl:
            warning = (
                "Few pool candidates for this role"
                if count < _WEAK_ROLE_MIN
                else "Many records need data enrichment"
            )
        job_id = role_title_to_job_id.get(title.lower())
        weak_coverage.append(
            {
                "role_title": title,
                "candidate_count": count,
                "gap_count": gaps,
                "coverage_warning": warning,
                "job_id": job_id,
                "suggested_action": "ask_recruiter_review" if gaps else "import_more",
            }
        )
        if len(weak_coverage) >= 5:
            break

    suggested_actions: list[dict[str, str]] = []
    if any(r["suggested_action"] == "import_more" for r in weak_coverage):
        suggested_actions.append(
            {
                "code": "import_more",
                "label": "Poproś rekrutera o import CSV" if pl else "Ask recruiter to import CSV",
                "href": "/recruiter/talent-pool/import",
            }
        )
    if role_gap_counts:
        suggested_actions.append(
            {
                "code": "enrich_records",
                "label": "Wzbogać brakujące role i umiejętności" if pl else "Enrich missing roles and skills",
                "href": "/recruiter/talent-pool",
            }
        )
    if weak_coverage:
        suggested_actions.append(
            {
                "code": "ask_recruiter_review",
                "label": "Poproś rekrutera o przegląd" if pl else "Ask recruiter to review",
                "href": "/recruiter/talent-pool",
            }
        )

    return {
        "top_roles": top_roles,
        "top_skills": top_skills,
        "weak_coverage": weak_coverage,
        "suggested_actions": suggested_actions[:4],
    }


def _readiness_row(
    rec: RecruiterTalentPoolRecord,
    *,
    duplicate_keys: set[str],
    role_title_to_job_id: dict[str, int],
    stale_cutoff: datetime,
) -> dict[str, Any]:
    state = _readiness_state(rec, duplicate_keys=duplicate_keys, stale_cutoff=stale_cutoff)
    title = (rec.job_title or "").strip()
    job_id = role_title_to_job_id.get(title.lower()) if title else None
    radar_href = f"/recruiter/talent-radar?role_id={job_id}" if job_id else "/recruiter/talent-radar"
    return {
        "id": rec.id,
        "display_name": rec.display_name,
        "job_title": rec.job_title,
        "readiness_state": state,
        "radar_href": radar_href,
    }


def _build_readiness(
    records: list[RecruiterTalentPoolRecord],
    *,
    duplicate_keys: set[str],
    role_title_to_job_id: dict[str, int],
    limit: int,
) -> dict[str, Any]:
    stale_cutoff = datetime.now(timezone.utc) - timedelta(days=_STALE_DAYS)
    state_counts: Counter[str] = Counter()
    candidates: list[dict[str, Any]] = []

    for rec in records:
        state = _readiness_state(rec, duplicate_keys=duplicate_keys, stale_cutoff=stale_cutoff)
        state_counts[state] += 1

    ordered = sorted(
        records,
        key=lambda r: r.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    for rec in ordered[:limit]:
        candidates.append(
            _readiness_row(
                rec,
                duplicate_keys=duplicate_keys,
                role_title_to_job_id=role_title_to_job_id,
                stale_cutoff=stale_cutoff,
            )
        )

    return {
        "counts": {
            "ready": state_counts.get("ready", 0),
            "needs_enrichment": state_counts.get("needs_enrichment", 0),
            "duplicate_review": state_counts.get("duplicate_review", 0),
            "consent_required": state_counts.get("consent_required", 0),
            "stale": state_counts.get("stale", 0),
        },
        "candidates": candidates,
    }


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
    company_jobs = list_company_jobs(db, company_slug=slug, limit=50)
    role_title_to_job_id = _role_title_map(company_jobs)
    duplicate_keys = _duplicate_keys(all_records)

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

    role_skill_coverage = _build_role_skill_coverage(
        all_records,
        role_title_to_job_id=role_title_to_job_id,
        locale=locale,
    )
    readiness = _build_readiness(
        all_records,
        duplicate_keys=duplicate_keys,
        role_title_to_job_id=role_title_to_job_id,
        limit=limit,
    )

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
        "role_skill_coverage": role_skill_coverage,
        "readiness": readiness,
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
            "talent_radar": "/recruiter/talent-radar",
        },
        "scope_note": (
            "Pamięć talentów firmy — dane wewnętrzne, bez live sync ATS i bez automatycznego outreachu."
            if pl
            else "Company talent memory — internal data only, no live ATS sync or automatic outreach."
        ),
    }
