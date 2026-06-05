"""Deterministic match summary for recruiter inbox rows (no LLM)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.database.models import Candidate, Job, JobMatch
from app.matching.matcher import calculate_match_score
from app.matching.quality_gate import match_quality_label
from app.services.matching_service import candidate_to_dict, job_to_dict

PII_CONTEXT_APPLICATION_REVIEW = "application_review"
PII_CONTEXT_TALENT_POOL = "talent_pool_anonymized"


def _norm_list(raw: Any) -> list[str]:
    if isinstance(raw, list):
        items = raw
    else:
        return []
    return [str(x).strip().lower() for x in items if str(x).strip()]


def _build_recruiter_match_reasons(
    candidate: dict[str, Any],
    job: dict[str, Any],
    *,
    score: float,
    locale: str = "en",
) -> list[str]:
    """Return up to 3 evidence-based reasons in recruiter voice (no outcome claims)."""
    pl = locale.lower().startswith("pl")
    reasons: list[str] = []

    titles = _norm_list(candidate.get("preferred_job_titles"))
    job_title = (job.get("title") or "").lower()
    if titles and any(t in job_title or job_title in t for t in titles):
        reasons.append(
            "Preferowany tytuł roli kandydata pasuje do ogłoszenia"
            if pl
            else "Candidate target role title aligns with posting"
        )

    skills = _norm_list(candidate.get("skills"))
    req_blob = f"{job.get('requirements') or ''} {job.get('description') or ''}".lower()
    matched = [s for s in skills[:12] if s in req_blob]
    if matched:
        sample = ", ".join(matched[:3])
        reasons.append(
            f"Nakładka umiejętności w profilu: {sample}" if pl else f"Profile skills overlap: {sample}"
        )

    cand_loc = (candidate.get("location") or "").strip().lower()
    job_loc = (job.get("location") or "").strip().lower()
    if cand_loc and job_loc and (cand_loc in job_loc or job_loc in cand_loc):
        reasons.append(
            "Lokalizacja kandydata zgodna z ogłoszeniem" if pl else "Candidate location matches posting"
        )

    desired = candidate.get("desired_salary")
    sal_max = job.get("salary_max")
    if desired and sal_max and int(desired) <= int(sal_max):
        reasons.append(
            "Widełki pensji kandydata mieszczą się w ogłoszeniu" if pl else "Salary band within posting range"
        )

    years = candidate.get("experience_years") or 0
    if years >= 5 and any(w in job_title for w in ("senior", "lead", "head", "dyrektor", "manager")):
        reasons.append(
            "Doświadczenie profilu pasuje do poziomu roli" if pl else "Experience level fits role seniority"
        )
    elif years < 3 and "junior" in job_title:
        reasons.append(
            "Profil junior pasuje do poziomu ogłoszenia" if pl else "Junior profile fits posting level"
        )

    if not reasons:
        if score >= 80:
            reasons.append(
                "Silne nakładanie profilu z wymaganiami ogłoszenia"
                if pl
                else "Strong profile overlap with posting requirements"
            )
        elif score >= 60:
            reasons.append(
                "Dobre ogólne dopasowanie profilu do roli" if pl else "Solid overall profile fit for role"
            )
        elif score >= 40:
            reasons.append(
                "Częściowe dopasowanie — warto ocenić ręcznie"
                if pl
                else "Partial overlap — worth manual review"
            )
        else:
            reasons.append(
                "Niskie dopasowanie algorytmu — decyzja rekrutera wymagana"
                if pl
                else "Low algorithmic fit — recruiter decision required"
            )

    return reasons[:3]


def build_recruiter_match_summary(
    db: Session,
    candidate: Candidate,
    job: Job,
    *,
    locale: str = "en",
) -> dict[str, Any]:
    """Score + label + reasons for one inbox application row."""
    cand = candidate_to_dict(candidate)
    jdict = job_to_dict(job)

    persisted = (
        db.query(JobMatch)
        .filter(JobMatch.candidate_id == candidate.id, JobMatch.job_id == job.id)
        .first()
    )
    score = float(persisted.score) if persisted and persisted.score is not None else float(
        calculate_match_score(cand, jdict)
    )

    return {
        "match_score": round(score, 2),
        "match_score_label": match_quality_label(score),
        "match_reasons": _build_recruiter_match_reasons(cand, jdict, score=score, locale=locale),
        "human_decision_required": True,
        "pii_context": PII_CONTEXT_APPLICATION_REVIEW,
    }
