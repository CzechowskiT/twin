"""Persistent candidate career compass — one row per candidate."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidateCareerCompass

ALLOWED_SENIORITIES = frozenset({"junior", "mid", "senior", "lead", "director", "executive"})
ALLOWED_WORK_MODES = frozenset({"remote", "hybrid", "onsite", "flexible"})
ALLOWED_CURRENCIES = frozenset({"PLN", "EUR", "USD", "GBP"})
ALLOWED_COMPLETION = frozenset({"draft", "partial", "complete"})
MAX_LIST_ITEMS = 30
MAX_ITEM_LEN = 200
MAX_NOTES_LEN = 4000
MAX_ROLE_LEN = 200
READINESS_REQUIRED_FIELDS = ("target_role", "target_seniority", "career_priorities", "next_steps")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    out: list[str] = []
    for item in data:
        s = str(item).strip()[:MAX_ITEM_LEN]
        if s and s not in out:
            out.append(s)
        if len(out) >= MAX_LIST_ITEMS:
            break
    return out


def _dump_json_list(items: list[str] | None) -> str:
    cleaned: list[str] = []
    for item in items or []:
        s = str(item).strip()[:MAX_ITEM_LEN]
        if s and s not in cleaned:
            cleaned.append(s)
        if len(cleaned) >= MAX_LIST_ITEMS:
            break
    return json.dumps(cleaned)


def _normalize_enum(value: str | None, allowed: frozenset[str]) -> str | None:
    if value is None:
        return None
    v = value.strip().lower()
    return v if v in allowed else None


def _normalize_currency(value: str | None) -> str:
    if not value:
        return "PLN"
    v = value.strip().upper()
    return v if v in ALLOWED_CURRENCIES else "PLN"


def _field_present(row: CandidateCareerCompass, field: str) -> bool:
    if field == "target_role":
        return bool((row.target_role or "").strip())
    if field == "target_seniority":
        return bool((row.target_seniority or "").strip())
    if field == "career_priorities":
        return len(_parse_json_list(row.career_priorities)) >= 1
    if field == "next_steps":
        return len(_parse_json_list(row.next_steps)) >= 1
    return False


def compute_completion(row: CandidateCareerCompass | None) -> dict[str, Any]:
    """Completion % and missing fields for readiness UI."""
    tracked = [
        "target_role",
        "target_seniority",
        "preferred_industries",
        "preferred_locations",
        "work_mode",
        "salary_expectation_min",
        "salary_expectation_max",
        "career_priorities",
        "skill_gaps",
        "strengths",
        "next_steps",
        "learning_actions",
        "notes",
    ]
    if row is None:
        return {
            "completion_percent": 0,
            "missing_fields": list(tracked),
            "completion_status": "draft",
            "readiness_complete": False,
        }
    missing: list[str] = []
    filled = 0
    for field in tracked:
        if field in ("preferred_industries", "preferred_locations", "career_priorities", "skill_gaps", "strengths", "next_steps", "learning_actions"):
            present = len(_parse_json_list(getattr(row, field))) >= 1
        elif field in ("salary_expectation_min", "salary_expectation_max"):
            present = getattr(row, field) is not None
        elif field == "notes":
            present = bool((row.notes or "").strip())
        else:
            present = bool((getattr(row, field) or "").strip())
        if present:
            filled += 1
        else:
            missing.append(field)
    pct = int(round(filled / len(tracked) * 100))
    readiness_complete = career_brief_readiness_complete(row)
    if readiness_complete:
        status = "complete"
    elif filled == 0:
        status = "draft"
    else:
        status = "partial"
    return {
        "completion_percent": pct,
        "missing_fields": missing,
        "completion_status": status,
        "readiness_complete": readiness_complete,
    }


def career_brief_readiness_complete(row: CandidateCareerCompass | None) -> bool:
    """Readiness gate: target_role + seniority + >=1 priority + >=1 next_step."""
    if row is None:
        return False
    return all(_field_present(row, f) for f in READINESS_REQUIRED_FIELDS)


def serialize_compass(row: CandidateCareerCompass | None) -> dict[str, Any]:
    if row is None:
        meta = compute_completion(None)
        return {
            "configured": False,
            "target_role": None,
            "target_seniority": None,
            "preferred_industries": [],
            "preferred_locations": [],
            "work_mode": None,
            "salary_expectation_min": None,
            "salary_expectation_max": None,
            "salary_currency": "PLN",
            "career_priorities": [],
            "skill_gaps": [],
            "strengths": [],
            "next_steps": [],
            "learning_actions": [],
            "notes": None,
            "completion_status": meta["completion_status"],
            "completion_percent": meta["completion_percent"],
            "missing_fields": meta["missing_fields"],
            "readiness_complete": meta["readiness_complete"],
            "updated_at": None,
        }
    meta = compute_completion(row)
    return {
        "configured": True,
        "target_role": row.target_role,
        "target_seniority": row.target_seniority,
        "preferred_industries": _parse_json_list(row.preferred_industries),
        "preferred_locations": _parse_json_list(row.preferred_locations),
        "work_mode": row.work_mode,
        "salary_expectation_min": row.salary_expectation_min,
        "salary_expectation_max": row.salary_expectation_max,
        "salary_currency": row.salary_currency or "PLN",
        "career_priorities": _parse_json_list(row.career_priorities),
        "skill_gaps": _parse_json_list(row.skill_gaps),
        "strengths": _parse_json_list(row.strengths),
        "next_steps": _parse_json_list(row.next_steps),
        "learning_actions": _parse_json_list(row.learning_actions),
        "notes": row.notes,
        "completion_status": meta["completion_status"],
        "completion_percent": meta["completion_percent"],
        "missing_fields": meta["missing_fields"],
        "readiness_complete": meta["readiness_complete"],
        "updated_at": row.updated_at,
    }


def get_compass_row(db: Session, *, candidate_id: int) -> CandidateCareerCompass | None:
    return (
        db.query(CandidateCareerCompass)
        .filter(CandidateCareerCompass.candidate_id == candidate_id)
        .first()
    )


def validate_compass_payload(data: dict[str, Any], *, partial: bool = False) -> dict[str, Any]:
    """Normalize and validate upsert/patch payload."""
    out: dict[str, Any] = {}
    errors: list[str] = []

    def require(key: str) -> bool:
        if partial:
            return key in data
        return True

    if require("target_role"):
        role = str(data.get("target_role") or "").strip()[:MAX_ROLE_LEN]
        out["target_role"] = role or None

    if require("target_seniority"):
        raw_sen = data.get("target_seniority")
        if raw_sen is None or str(raw_sen).strip() == "":
            out["target_seniority"] = None
        else:
            sen = _normalize_enum(str(raw_sen), ALLOWED_SENIORITIES)
            if sen is None:
                errors.append("target_seniority is invalid")
            else:
                out["target_seniority"] = sen

    list_fields = (
        "preferred_industries",
        "preferred_locations",
        "career_priorities",
        "skill_gaps",
        "strengths",
        "next_steps",
        "learning_actions",
    )
    for field in list_fields:
        if require(field):
            raw = data.get(field)
            if raw is None:
                out[field] = []
            elif isinstance(raw, list):
                out[field] = _parse_json_list(_dump_json_list(raw))
            else:
                errors.append(f"{field} must be a list")

    if require("work_mode"):
        raw_wm = data.get("work_mode")
        if raw_wm is None or str(raw_wm).strip() == "":
            out["work_mode"] = None
        else:
            wm = _normalize_enum(str(raw_wm), ALLOWED_WORK_MODES)
            if wm is None:
                errors.append("work_mode is invalid")
            else:
                out["work_mode"] = wm

    if require("salary_currency"):
        out["salary_currency"] = _normalize_currency(
            str(data.get("salary_currency") or "PLN")
        )

    for sal_field in ("salary_expectation_min", "salary_expectation_max"):
        if require(sal_field):
            raw = data.get(sal_field)
            if raw is None or raw == "":
                out[sal_field] = None
            else:
                try:
                    val = int(raw)
                    if val < 0 or val > 10_000_000:
                        errors.append(f"{sal_field} out of range")
                    else:
                        out[sal_field] = val
                except (TypeError, ValueError):
                    errors.append(f"{sal_field} must be an integer")

    if require("notes"):
        notes = data.get("notes")
        if notes is None or str(notes).strip() == "":
            out["notes"] = None
        else:
            out["notes"] = str(notes).strip()[:MAX_NOTES_LEN]

    sal_min = out.get("salary_expectation_min", data.get("salary_expectation_min"))
    sal_max = out.get("salary_expectation_max", data.get("salary_expectation_max"))
    if sal_min is not None and sal_max is not None and int(sal_min) > int(sal_max):
        errors.append("salary_expectation_min must be <= salary_expectation_max")

    if errors:
        raise ValueError("; ".join(errors))
    return out


def upsert_compass(db: Session, *, candidate_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    normalized = validate_compass_payload(payload, partial=False)
    now = _utcnow()
    row = get_compass_row(db, candidate_id=candidate_id)
    if row is None:
        row = CandidateCareerCompass(candidate_id=candidate_id, created_at=now, updated_at=now)
        db.add(row)
    _apply_fields(row, normalized)
    meta = compute_completion(row)
    row.completion_status = meta["completion_status"]
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_compass(row)


def patch_compass(db: Session, *, candidate_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    normalized = validate_compass_payload(payload, partial=True)
    if not normalized:
        row = get_compass_row(db, candidate_id=candidate_id)
        return serialize_compass(row)
    now = _utcnow()
    row = get_compass_row(db, candidate_id=candidate_id)
    if row is None:
        row = CandidateCareerCompass(candidate_id=candidate_id, created_at=now, updated_at=now)
        db.add(row)
    _apply_fields(row, normalized)
    meta = compute_completion(row)
    row.completion_status = meta["completion_status"]
    row.updated_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_compass(row)


def _apply_fields(row: CandidateCareerCompass, data: dict[str, Any]) -> None:
    if "target_role" in data:
        row.target_role = data["target_role"]
    if "target_seniority" in data:
        row.target_seniority = data["target_seniority"]
    for field in (
        "preferred_industries",
        "preferred_locations",
        "career_priorities",
        "skill_gaps",
        "strengths",
        "next_steps",
        "learning_actions",
    ):
        if field in data:
            setattr(row, field, _dump_json_list(data[field]))
    if "work_mode" in data:
        row.work_mode = data["work_mode"]
    if "salary_expectation_min" in data:
        row.salary_expectation_min = data["salary_expectation_min"]
    if "salary_expectation_max" in data:
        row.salary_expectation_max = data["salary_expectation_max"]
    if "salary_currency" in data:
        row.salary_currency = data["salary_currency"]
    if "notes" in data:
        row.notes = data["notes"]
