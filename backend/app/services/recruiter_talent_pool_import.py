"""Recruiter talent pool import — CSV parse, normalize, validate, preview, commit."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import RecruiterTalentPoolImport, RecruiterTalentPoolRecord
from app.services.recruiter_inbox import _require_company_slug

TALENT_POOL_AUDIT_EVENT_TYPES = frozenset(
    {
        "talent_pool_import_previewed",
        "talent_pool_import_committed",
        "talent_pool_record_created",
        "talent_pool_duplicate_detected",
        "talent_pool_import_failed",
    }
)

REQUIRED_COLUMNS = frozenset({"display_name"})
OPTIONAL_COLUMNS = frozenset(
    {
        "candidate_id",
        "application_id",
        "job_id",
        "external_ats_id",
        "job_title",
        "location",
        "seniority",
        "skills",
        "pipeline_status",
    }
)
ALL_COLUMNS = REQUIRED_COLUMNS | OPTIONAL_COLUMNS
_FORBIDDEN_COLUMNS = frozenset({"email", "phone", "phone_number", "cv", "cv_text", "linkedin_url"})
_MAX_ROWS = 500
_MAX_CSV_BYTES = 512_000


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _append_audit(import_row: RecruiterTalentPoolImport, event_type: str, meta: dict[str, Any] | None = None) -> None:
    if event_type not in TALENT_POOL_AUDIT_EVENT_TYPES:
        return
    events: list[dict[str, Any]] = []
    if import_row.audit_json:
        try:
            loaded = json.loads(import_row.audit_json)
            if isinstance(loaded, list):
                events = loaded
        except json.JSONDecodeError:
            events = []
    clean_meta = {k: str(v)[:256] for k, v in (meta or {}).items() if v is not None}
    events.append(
        {
            "event_type": event_type,
            "meta": clean_meta,
            "created_at": _utc_now().isoformat(),
        }
    )
    import_row.audit_json = json.dumps(events[-100:])


def _normalize_header(name: str) -> str:
    return re.sub(r"[^a-z0-9_]", "_", name.strip().lower()).strip("_")


def _parse_skills(raw: str | None) -> list[str]:
    if not raw:
        return []
    parts = re.split(r"[;,|]", raw)
    return [p.strip() for p in parts if p.strip()][:20]


def _duplicate_key(company_slug: str, row: dict[str, str]) -> str:
    parts = [
        company_slug,
        (row.get("display_name") or "").strip().lower(),
        (row.get("external_ats_id") or "").strip().lower(),
        (row.get("candidate_id") or "").strip().lower(),
    ]
    digest = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return digest[:64]


def _data_quality(row: dict[str, str]) -> dict[str, Any]:
    warnings: list[str] = []
    score = 100
    if not row.get("skills"):
        warnings.append("missing_skills")
        score -= 20
    if not row.get("job_title"):
        warnings.append("missing_job_title")
        score -= 10
    if not row.get("location"):
        warnings.append("missing_location")
        score -= 5
    if not row.get("external_ats_id") and not row.get("candidate_id"):
        warnings.append("missing_external_ref")
        score -= 15
    level = "high" if score >= 80 else "medium" if score >= 50 else "low"
    return {"score": score, "level": level, "warnings": warnings}


def _parse_csv_text(csv_text: str) -> tuple[list[dict[str, str]], list[str]]:
    warnings: list[str] = []
    if len(csv_text.encode("utf-8")) > _MAX_CSV_BYTES:
        raise ValueError("CSV payload too large.")
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV must include a header row.")
    headers = [_normalize_header(h) for h in reader.fieldnames if h]
    for forbidden in _FORBIDDEN_COLUMNS:
        if forbidden in headers:
            raise ValueError(f"Forbidden column: {forbidden}")
    if "display_name" not in headers:
        raise ValueError("CSV must include display_name column.")
    unknown = [h for h in headers if h and h not in ALL_COLUMNS]
    if unknown:
        warnings.append(f"ignored_columns:{','.join(unknown[:5])}")

    rows: list[dict[str, str]] = []
    for idx, raw in enumerate(reader):
        if idx >= _MAX_ROWS:
            warnings.append(f"truncated_at_{_MAX_ROWS}")
            break
        mapped: dict[str, str] = {}
        for orig, norm in zip(reader.fieldnames or [], headers):
            val = (raw.get(orig) or "").strip()
            if norm and val:
                mapped[norm] = val[:500]
        if mapped.get("display_name"):
            rows.append(mapped)
    return rows, warnings


def _existing_duplicate_keys(db: Session, company_slug: str) -> set[str]:
    keys = (
        db.query(RecruiterTalentPoolRecord.duplicate_key)
        .filter(RecruiterTalentPoolRecord.company_slug == company_slug)
        .all()
    )
    return {k[0] for k in keys}


def _preview_rows(
    db: Session,
    *,
    company_slug: str,
    parsed: list[dict[str, str]],
) -> list[dict[str, Any]]:
    existing = _existing_duplicate_keys(db, company_slug)
    seen: set[str] = set()
    preview: list[dict[str, Any]] = []
    for idx, row in enumerate(parsed):
        dkey = _duplicate_key(company_slug, row)
        quality = _data_quality(row)
        status = "ready"
        if dkey in existing or dkey in seen:
            status = "duplicate"
        elif not row.get("display_name"):
            status = "error"
        seen.add(dkey)
        preview.append(
            {
                "row_index": idx,
                "display_name": row.get("display_name", ""),
                "job_title": row.get("job_title"),
                "location": row.get("location"),
                "skills": _parse_skills(row.get("skills")),
                "external_ats_id": row.get("external_ats_id"),
                "candidate_id": row.get("candidate_id"),
                "application_id": row.get("application_id"),
                "job_id": row.get("job_id"),
                "pipeline_status": row.get("pipeline_status"),
                "seniority": row.get("seniority"),
                "data_quality": quality,
                "duplicate_key": dkey,
                "status": status,
            }
        )
    return preview


def preview_talent_pool_import(
    db: Session,
    *,
    company_slug: str,
    csv_text: str,
    import_source: str = "csv_paste",
) -> dict[str, Any]:
    """Preview import and persist row data for later commit."""
    return preview_and_store(
        db,
        company_slug=company_slug,
        csv_text=csv_text,
        import_source=import_source,
    )


def commit_talent_pool_import(
    db: Session,
    *,
    company_slug: str,
    import_id: int,
) -> dict[str, Any]:
    slug = _require_company_slug(company_slug)
    import_row = (
        db.query(RecruiterTalentPoolImport)
        .filter(
            RecruiterTalentPoolImport.id == import_id,
            RecruiterTalentPoolImport.company_slug == slug,
        )
        .first()
    )
    if not import_row:
        raise ValueError("Import batch not found.")
    if import_row.status == "committed":
        raise ValueError("Import already committed.")
    if import_row.status == "failed":
        raise ValueError("Import failed — create a new preview.")

    preview_data = _load_stored_preview(import_row)
    if not preview_data:
        raise ValueError("Preview data expired — run preview again.")

    accepted = 0
    duplicates = 0
    for row in preview_data:
        if row["status"] != "ready":
            if row["status"] == "duplicate":
                duplicates += 1
            continue
        app_id = None
        job_id = None
        if row.get("application_id"):
            try:
                app_id = int(str(row["application_id"]))
            except ValueError:
                pass
        if row.get("job_id"):
            try:
                job_id = int(str(row["job_id"]))
            except ValueError:
                pass
        record = RecruiterTalentPoolRecord(
            company_slug=slug,
            import_id=import_row.id,
            candidate_id=(row.get("candidate_id") or None),
            application_id=app_id,
            job_id=job_id,
            external_ats_id=(row.get("external_ats_id") or None),
            display_name=row["display_name"][:200],
            job_title=(row.get("job_title") or None),
            location=(row.get("location") or None),
            seniority=(row.get("seniority") or None),
            skills_json=json.dumps(row.get("skills") or []),
            data_quality_json=json.dumps(row.get("data_quality") or {}),
            duplicate_key=row["duplicate_key"],
            pipeline_status=(row.get("pipeline_status") or None),
            created_at=_utc_now(),
        )
        db.add(record)
        accepted += 1
        _append_audit(
            import_row,
            "talent_pool_record_created",
            {"record_display": row["display_name"][:80], "duplicate_key": row["duplicate_key"][:32]},
        )

    import_row.status = "committed"
    import_row.accepted_count = accepted
    import_row.duplicate_count = duplicates
    import_row.committed_at = _utc_now()
    _append_audit(import_row, "talent_pool_import_committed", {"accepted_count": accepted})
    db.commit()
    db.refresh(import_row)
    return {
        "import_id": import_row.id,
        "company_slug": slug,
        "status": "committed",
        "summary": {
            "accepted": accepted,
            "duplicates_skipped": duplicates,
            "total_previewed": import_row.row_count,
        },
        "audit_events": json.loads(import_row.audit_json or "[]"),
    }


def _load_stored_preview(import_row: RecruiterTalentPoolImport) -> list[dict[str, Any]]:
    if not import_row.warnings_json:
        return []
    try:
        warnings = json.loads(import_row.warnings_json)
    except json.JSONDecodeError:
        return []
    for w in warnings:
        if isinstance(w, str) and w.startswith("preview_rows:"):
            try:
                loaded = json.loads(w.replace("preview_rows:", "", 1))
                if isinstance(loaded, list):
                    return loaded
            except json.JSONDecodeError:
                continue
    return []


def store_preview_for_commit(
    db: Session,
    import_row: RecruiterTalentPoolImport,
    preview_rows: list[dict[str, Any]],
) -> None:
    warnings: list[str] = []
    if import_row.warnings_json:
        try:
            loaded = json.loads(import_row.warnings_json)
            if isinstance(loaded, list):
                warnings = [w for w in loaded if not str(w).startswith("preview_rows:")]
        except json.JSONDecodeError:
            warnings = []
    warnings.append(f"preview_rows:{json.dumps(preview_rows)}")
    import_row.warnings_json = json.dumps(warnings)


def preview_and_store(
    db: Session,
    *,
    company_slug: str,
    csv_text: str,
    import_source: str = "csv_paste",
) -> dict[str, Any]:
    """Preview import and persist row data for later commit."""
    slug = _require_company_slug(company_slug)
    import_row = RecruiterTalentPoolImport(
        company_slug=slug,
        import_source=(import_source or "csv_paste")[:64],
        status="preview",
        created_at=_utc_now(),
    )
    db.add(import_row)
    db.flush()
    try:
        parsed, parse_warnings = _parse_csv_text(csv_text)
        preview = _preview_rows(db, company_slug=slug, parsed=parsed)
        dup_count = sum(1 for r in preview if r["status"] == "duplicate")
        err_count = sum(1 for r in preview if r["status"] == "error")
        ready_count = sum(1 for r in preview if r["status"] == "ready")
        warnings = list(parse_warnings)
        if dup_count:
            warnings.append(f"duplicates_detected:{dup_count}")
        store_preview_for_commit(db, import_row, preview)
        import_row.row_count = len(preview)
        import_row.duplicate_count = dup_count
        import_row.error_count = err_count
        _append_audit(
            import_row,
            "talent_pool_import_previewed",
            {"row_count": len(preview), "ready_count": ready_count},
        )
        if dup_count:
            _append_audit(import_row, "talent_pool_duplicate_detected", {"count": dup_count})
        db.commit()
        db.refresh(import_row)
        return {
            "import_id": import_row.id,
            "company_slug": slug,
            "status": "preview",
            "summary": {
                "total": len(preview),
                "ready": ready_count,
                "duplicates": dup_count,
                "errors": err_count,
            },
            "warnings": warnings,
            "rows": preview,
            "audit_events": json.loads(import_row.audit_json or "[]"),
        }
    except ValueError as exc:
        _append_audit(import_row, "talent_pool_import_failed", {"reason": str(exc)[:200]})
        import_row.status = "failed"
        import_row.error_count = 1
        db.commit()
        raise
