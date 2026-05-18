"""Match scoring v2: v1 rules plus optional salary overlap bonus and optional TF-IDF text similarity."""

from __future__ import annotations

import json
from typing import Any

from app.matching.matcher import calculate_match_score


def _salary_overlap_bonus(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Up to +5 points when stated expectations overlap the job band (PLN heuristic)."""
    want = candidate.get("desired_salary")
    jmin, jmax = job.get("salary_min"), job.get("salary_max")
    if want is None or jmin is None or jmax is None:
        return 0.0
    try:
        w = float(want)
        lo = float(jmin)
        hi = float(jmax)
    except (TypeError, ValueError):
        return 0.0
    if hi < lo:
        lo, hi = hi, lo
    if w >= lo * 0.85 and w <= hi * 1.15:
        return 5.0
    return 0.0


def calculate_match_score_v2(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """v1 score plus bounded salary overlap bonus (still capped at 100)."""
    base = calculate_match_score(candidate, job)
    return round(min(100.0, base + _salary_overlap_bonus(candidate, job)), 2)


def _jsonish_list(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
    return []


def _candidate_text_blob(candidate: dict[str, Any]) -> str:
    parts: list[str] = []
    parts.extend(_jsonish_list(candidate.get("skills")))
    parts.extend(_jsonish_list(candidate.get("preferred_job_titles")))
    cv = (candidate.get("cv_text") or "").strip()
    if cv:
        parts.append(cv[:12000])
    return " ".join(parts).strip()


def _job_text_blob(job: dict[str, Any]) -> str:
    chunks = [job.get("title"), job.get("requirements"), job.get("description")]
    return " ".join(str(c).strip() for c in chunks if c).strip()


def _tfidf_similarity_bonus(candidate: dict[str, Any], job: dict[str, Any]) -> float:
    """Cosine similarity on a two-document TF-IDF fit; mapped to a small additive slice (max ~20)."""
    doc_a = _candidate_text_blob(candidate)
    doc_b = _job_text_blob(job)
    if len(doc_a) < 24 or len(doc_b) < 24:
        return 0.0

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    vec = TfidfVectorizer(
        max_features=4096,
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.98,
        strip_accents="unicode",
    )
    try:
        mat = vec.fit_transform([doc_a[:16000], doc_b[:16000]])
    except ValueError:
        return 0.0
    sim = float(cosine_similarity(mat[0:1], mat[1:2])[0, 0])
    if sim != sim:  # NaN guard
        return 0.0
    return min(20.0, max(0.0, sim * 22.0))


def calculate_match_score_v2_tfidf(
    candidate: dict[str, Any],
    job: dict[str, Any],
    *,
    include_v2_salary_bonus: bool,
) -> float:
    """v1 or v2 base plus TF-IDF layer (capped at 100)."""
    base_fn = calculate_match_score_v2 if include_v2_salary_bonus else calculate_match_score
    base = base_fn(candidate, job)
    return round(min(100.0, base + _tfidf_similarity_bonus(candidate, job)), 2)
