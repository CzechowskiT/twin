"""Persist CV files on disk."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database.models import Candidate
from app.services.cv_enrichment import enrich_from_cv_text
from app.services.cv_parser import extract_cv_text


def _parse_profile_signals(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def save_cv_for_candidate(
    db: Session,
    candidate: Candidate,
    *,
    content: bytes,
    filename: str,
) -> Candidate:
    settings = get_settings()
    text = extract_cv_text(content, filename)

    upload_dir = Path(settings.cv_upload_dir) / str(candidate.user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name.replace("..", "_")
    file_path = upload_dir / safe_name
    file_path.write_bytes(content)

    existing = {
        "skills": json.loads(candidate.skills) if candidate.skills else [],
        "experience_years": candidate.experience_years,
        "location": candidate.location,
        "preferred_job_titles": json.loads(candidate.preferred_job_titles)
        if candidate.preferred_job_titles
        else [],
    }
    enriched = enrich_from_cv_text(text, existing)

    candidate.resume_path = str(file_path)
    candidate.cv_text = text
    candidate.cv_filename = safe_name
    candidate.cv_uploaded_at = datetime.utcnow()
    candidate.skills = json.dumps(enriched.get("skills", existing["skills"]))
    if enriched.get("experience_years"):
        candidate.experience_years = int(enriched["experience_years"])
    if enriched.get("location") and not candidate.location:
        candidate.location = str(enriched["location"])[:100]

    titles = enriched.get("preferred_job_titles")
    if isinstance(titles, list):
        normalized: list[str] = []
        seen: set[str] = set()
        for t in titles:
            s = str(t).strip()[:120]
            if not s or s.lower() in seen:
                continue
            seen.add(s.lower())
            normalized.append(s)
            if len(normalized) >= 25:
                break
        candidate.preferred_job_titles = json.dumps(normalized)

    signals = _parse_profile_signals(candidate.profile_signals_json)
    if "cv_insights" in enriched and enriched["cv_insights"] is not None:
        signals["cv_insights"] = enriched["cv_insights"]
    else:
        signals.pop("cv_insights", None)
    candidate.profile_signals_json = json.dumps(signals) if signals else None

    db.commit()
    db.refresh(candidate)
    return candidate


def delete_cv_for_candidate(db: Session, candidate: Candidate) -> Candidate:
    if candidate.resume_path:
        path = Path(candidate.resume_path)
        if path.is_file():
            path.unlink(missing_ok=True)
    candidate.resume_path = None
    candidate.cv_text = None
    candidate.cv_filename = None
    candidate.cv_uploaded_at = None
    signals = _parse_profile_signals(candidate.profile_signals_json)
    signals.pop("cv_insights", None)
    signals.pop("cv_tailoring", None)
    candidate.profile_signals_json = json.dumps(signals) if signals else None
    db.commit()
    db.refresh(candidate)
    return candidate
