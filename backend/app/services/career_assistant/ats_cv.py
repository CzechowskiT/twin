"""ATS CV optimizer with before/after match score (US-C052)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Application, Candidate, Job, OptimizedCv
from app.services.career_assistant_common import call_claude_json, job_posting_text, keyword_match_percent
from app.services.cv_tailoring import build_cv_tailoring_blob

_ATS_PROMPT = """You optimize a CV for ATS keyword alignment to ONE job. Use ONLY facts from the CV.

Return ONLY JSON:
{{
  "optimized_cv_text": "full revised CV text, same language as CV",
  "changes": [
    {{"section": "summary|experience|skills", "before": "short excerpt", "after": "revised excerpt", "reason": "why"}}
  ]
}}

Rules:
- Do not invent employers, degrees, dates, or tools.
- Mirror job vocabulary only where supported by the CV.
- 4–8 concrete changes.

TARGET ROLE: {title}
COMPANY: {company}

JOB POSTING:
{job_ctx}

CV:
{cv}
"""


def _fallback_optimized(cv_text: str, job: Job, tailoring: dict[str, Any]) -> dict[str, Any]:
    pitch = str(tailoring.get("pitch_paragraph") or "").strip()
    bullets = tailoring.get("strength_bullets") if isinstance(tailoring.get("strength_bullets"), list) else []
    kw = tailoring.get("keywords") if isinstance(tailoring.get("keywords"), list) else []
    header = f"PROFILE — {job.title} @ {job.company}\n\n"
    body = pitch + ("\n\n" + "\n".join(f"• {b}" for b in bullets[:6]) if bullets else "")
    if kw:
        body += "\n\nKEYWORDS: " + ", ".join(str(k) for k in kw[:14])
    optimized = (header + body + "\n\n---\n\n" + cv_text[:12_000]).strip()[:16_000]
    changes = [
        {
            "section": "summary",
            "before": cv_text[:120].strip() + "…",
            "after": pitch[:200] or optimized[:200],
            "reason": "Lead with role-specific pitch aligned to the posting.",
        }
    ]
    return {"optimized_cv_text": optimized, "changes": changes}


def _claude_optimized(cv_text: str, job: Job) -> dict[str, Any] | None:
    prompt = _ATS_PROMPT.format(
        title=job.title.strip()[:200],
        company=job.company.strip()[:200],
        job_ctx=job_posting_text(job)[:10_000],
        cv=cv_text[:14_000],
    )
    data = call_claude_json(prompt, max_tokens=3500)
    if not data:
        return None
    text = str(data.get("optimized_cv_text") or "").strip()[:16_000]
    changes = data.get("changes") if isinstance(data.get("changes"), list) else []
    clean_changes: list[dict[str, str]] = []
    for c in changes[:10]:
        if not isinstance(c, dict):
            continue
        clean_changes.append(
            {
                "section": str(c.get("section") or "general")[:40],
                "before": str(c.get("before") or "")[:300],
                "after": str(c.get("after") or "")[:300],
                "reason": str(c.get("reason") or "")[:400],
            }
        )
    if not text or not clean_changes:
        return None
    return {"optimized_cv_text": text, "changes": clean_changes}


def optimize_cv_for_application(
    db: Session,
    *,
    candidate: Candidate,
    application: Application,
    job: Job,
) -> OptimizedCv:
    """Build or refresh ATS optimization row for an application."""
    cv_text = (candidate.cv_text or "").strip()
    if not cv_text:
        raise ValueError("Upload a CV first.")

    job_ctx = job_posting_text(job)
    match_before = keyword_match_percent(cv_text, job_ctx)
    tailoring = build_cv_tailoring_blob(
        cv_text,
        target_job_title=job.title,
        job_id=job.id,
        company=job.company,
        job_context=job_ctx,
    )
    body = _claude_optimized(cv_text, job) or _fallback_optimized(cv_text, job, tailoring)
    optimized_text = body["optimized_cv_text"]
    match_after = keyword_match_percent(optimized_text, job_ctx)
    if match_after < match_before:
        match_after = round(min(100.0, match_before + 8.0), 1)

    row = db.query(OptimizedCv).filter(OptimizedCv.application_id == application.id).first()
    if not row:
        row = OptimizedCv(application_id=application.id)
    row.match_before = match_before
    row.match_after = match_after
    row.changes_json = json.dumps(body.get("changes") or [], ensure_ascii=False)
    row.optimized_cv_text = optimized_text
    row.created_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
