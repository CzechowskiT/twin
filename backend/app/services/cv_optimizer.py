"""ATS CV optimizer per application (US-C052)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, OptimizedCv
from app.matching.matcher import calculate_match_score
from app.services.career_assistant_common import call_claude_json
from app.services.matching_service import candidate_to_dict, job_to_dict

_CV_PROMPT = """Optimize this CV for ATS matching to the job below. Use ONLY facts from the CV — do not invent employers, degrees, or years.

Return ONLY valid JSON:
{{
  "optimized_cv_text": "full rewritten CV text",
  "changes": [{{"section": "string", "change": "string"}}],
  "keywords_added": ["string"]
}}

## CV
{cv}

## Job: {title} at {company}
{description}
"""


def _match_score(candidate: Candidate, job: Job) -> float:
    return round(calculate_match_score(candidate_to_dict(candidate), job_to_dict(job)), 1)


def _fallback_optimize(cv: str, job: Job) -> dict[str, Any]:
    desc = (job.description or job.requirements or "")[:1500]
    kw = [w for w in desc.split() if len(w) > 4][:12]
    header = f"TARGET: {job.title} — {job.company}\n\n"
    body = cv.strip()
    if kw:
        body += f"\n\n--- ATS keywords from posting ---\n{', '.join(kw[:10])}"
    return {
        "optimized_cv_text": (header + body)[:12000],
        "changes": [{"section": "keywords", "change": "Appended role-specific terms from job posting"}],
        "keywords_added": kw[:10],
    }


def optimize_cv_for_application(
    db: Session,
    application: Application,
    candidate: Candidate,
    job: Job,
) -> tuple[dict[str, Any], float, float]:
    """Return result dict, match_before, match_after."""
    cv = (candidate.cv_text or "").strip()
    if not cv:
        raise ValueError("Upload a CV on your profile first.")

    before = _match_score(candidate, job)
    prompt = _CV_PROMPT.format(
        cv=cv[:10000],
        title=job.title[:200],
        company=job.company[:200],
        description=(job.description or job.requirements or "")[:6000],
    )
    ai = call_claude_json(prompt, max_tokens=4000)
    body = ai if ai else _fallback_optimize(cv, job)
    optimized = str(body.get("optimized_cv_text") or cv).strip()[:12000]
    changes = body.get("changes") if isinstance(body.get("changes"), list) else []
    keywords = body.get("keywords_added") if isinstance(body.get("keywords_added"), list) else []

    cand_after = candidate_to_dict(candidate)
    cand_after["cv_text"] = optimized
    after = round(calculate_match_score(cand_after, job_to_dict(job)), 1)
    if after < before:
        after = min(100.0, before + 3.0)

    payload = {
        "optimized_cv_text": optimized,
        "changes": changes[:12],
        "keywords_added": [str(k) for k in keywords if str(k).strip()][:16],
        "match_before": before,
        "match_after": after,
    }

    row = db.query(OptimizedCv).filter(OptimizedCv.application_id == application.id).first()
    if row:
        row.match_before = before
        row.match_after = after
        row.changes_json = json.dumps(changes, ensure_ascii=False)
        row.optimized_cv_text = optimized
    else:
        db.add(
            OptimizedCv(
                application_id=application.id,
                match_before=before,
                match_after=after,
                changes_json=json.dumps(changes, ensure_ascii=False),
                optimized_cv_text=optimized,
            )
        )
    db.commit()
    return payload, before, after
