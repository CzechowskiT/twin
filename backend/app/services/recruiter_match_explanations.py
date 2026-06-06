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


def _extract_matched_skills(candidate: dict[str, Any], job: dict[str, Any]) -> list[str]:
    skills = _norm_list(candidate.get("skills"))
    req_blob = f"{job.get('requirements') or ''} {job.get('description') or ''}".lower()
    return [s for s in skills[:12] if s in req_blob]


def _infer_data_confidence(
    candidate: dict[str, Any],
    job: dict[str, Any],
    *,
    score: float,
) -> str:
    """Heuristic profile completeness + overlap — not a hiring recommendation."""
    has_skills = bool(_norm_list(candidate.get("skills")))
    has_titles = bool(_norm_list(candidate.get("preferred_job_titles")))
    has_location = bool((candidate.get("location") or "").strip())
    matched = _extract_matched_skills(candidate, job)
    evidence = sum([has_skills, has_titles, has_location, len(matched) >= 2])
    if not has_skills and not has_titles:
        return "unknown"
    if score >= 80 and evidence >= 3:
        return "high"
    if score >= 60 and evidence >= 2:
        return "medium"
    if score >= 40:
        return "low"
    return "unknown"


def _build_recruiter_review_card(
    candidate: dict[str, Any],
    job: dict[str, Any],
    *,
    score: float,
    locale: str = "en",
) -> dict[str, Any]:
    """Structured review receipt for one inbox row (deterministic, no LLM)."""
    pl = locale.lower().startswith("pl")
    matched_skills = _extract_matched_skills(candidate, job)
    skills = _norm_list(candidate.get("skills"))
    titles = _norm_list(candidate.get("preferred_job_titles"))
    job_title = (job.get("title") or "").strip()
    req_blob = f"{job.get('requirements') or ''} {job.get('description') or ''}".lower()
    cand_loc = (candidate.get("location") or "").strip()
    job_loc = (job.get("location") or "").strip()
    years = int(candidate.get("experience_years") or 0)
    desired = candidate.get("desired_salary")
    sal_max = job.get("salary_max")
    sal_min = job.get("salary_min")

    title_aligned = bool(
        titles and job_title and any(t in job_title.lower() or job_title.lower() in t for t in titles)
    )
    location_aligned = bool(
        cand_loc and job_loc and (cand_loc.lower() in job_loc.lower() or job_loc.lower() in cand_loc.lower())
    )
    salary_ok = bool(desired and sal_max and int(desired) <= int(sal_max))
    salary_high = bool(desired and sal_min and int(desired) > int(sal_max or 0))

    requirements_matched: list[str] = []
    if matched_skills:
        sample = ", ".join(matched_skills[:5])
        requirements_matched.append(
            f"Umiejętności w profilu w treści ogłoszenia: {sample}"
            if pl
            else f"Profile skills found in posting text: {sample}"
        )
    if title_aligned:
        requirements_matched.append(
            "Preferowany tytuł roli zgodny z ogłoszeniem" if pl else "Target role title aligns with posting"
        )
    if location_aligned:
        requirements_matched.append(
            "Lokalizacja zgodna z ogłoszeniem" if pl else "Location aligns with posting"
        )
    if salary_ok:
        requirements_matched.append(
            "Oczekiwane wynagrodzenie mieści się w widełkach" if pl else "Expected salary within posting band"
        )

    uncertain_or_missing: list[str] = []
    if not skills:
        uncertain_or_missing.append(
            "Brak listy umiejętności w profilu" if pl else "No skills list on profile"
        )
    elif not matched_skills and req_blob.strip():
        uncertain_or_missing.append(
            "Brak wykrytej nakładki umiejętności z tekstem ogłoszenia"
            if pl
            else "No detected skill overlap with posting text"
        )
    if not title_aligned and titles:
        uncertain_or_missing.append(
            "Preferowany tytuł roli nie pokrywa się wprost z tytułem ogłoszenia"
            if pl
            else "Target role title does not directly match posting title"
        )
    if cand_loc and job_loc and not location_aligned:
        uncertain_or_missing.append(
            "Lokalizacja kandydata różni się od ogłoszenia" if pl else "Candidate location differs from posting"
        )
    if desired and sal_max and not salary_ok:
        uncertain_or_missing.append(
            "Oczekiwane wynagrodzenie powyżej widełek ogłoszenia"
            if pl
            else "Expected salary above posting maximum"
        )
    if not (candidate.get("cv_text") or "").strip():
        uncertain_or_missing.append(
            "Brak pełnego tekstu CV w profilu — tylko pola strukturalne"
            if pl
            else "No full CV text on profile — structured fields only"
        )

    what_to_verify: list[str] = []
    if matched_skills:
        what_to_verify.append(
            "Potwierdź głębię umiejętności wskazanych w profilu (np. rozmowa techniczna)"
            if pl
            else "Confirm depth of highlighted profile skills (e.g. technical screen)"
        )
    if years >= 5 or "senior" in job_title.lower():
        what_to_verify.append(
            "Zweryfikuj seniority i zakres odpowiedzialności"
            if pl
            else "Verify seniority and scope of responsibility"
        )
    if salary_high or (desired and not sal_max):
        what_to_verify.append(
            "Potwierdź oczekiwania finansowe przed slotem w kalendarzu"
            if pl
            else "Confirm compensation expectations before calendar slot"
        )
    if not location_aligned and (cand_loc or job_loc):
        what_to_verify.append(
            "Potwierdź model pracy (biuro / hybryda / zdalnie)"
            if pl
            else "Confirm work model (office / hybrid / remote)"
        )
    what_to_verify.append(
        "Sprawdź zgodność z wymaganiami prawnymi i polityką firmy"
        if pl
        else "Check legal eligibility and company policy fit"
    )

    red_flags: list[str] = []
    if score < 40:
        red_flags.append(
            "Niskie dopasowanie algorytmu — profil może nie spełniać podstawowych kryteriów"
            if pl
            else "Low algorithmic fit — profile may miss baseline criteria"
        )
    if salary_high:
        red_flags.append(
            "Oczekiwane wynagrodzenie powyżej maksimum ogłoszenia"
            if pl
            else "Expected salary above posting maximum"
        )
    if years < 3 and any(w in job_title.lower() for w in ("senior", "lead", "head")):
        red_flags.append(
            "Profil junior przy ogłoszeniu senior — sprawdź doświadczenie"
            if pl
            else "Junior profile on senior posting — verify experience"
        )
    if years >= 8 and "junior" in job_title.lower():
        red_flags.append(
            "Wysokie doświadczenie przy roli junior — możliwy overqualification"
            if pl
            else "High experience on junior role — possible overqualification"
        )

    if score >= 80:
        why = (
            "Profil ma silne nakładanie z ogłoszeniem — warto rozważyć slot w kalendarzu po weryfikacji."
            if pl
            else "Profile strongly overlaps the posting — worth a calendar slot after verification."
        )
    elif score >= 60:
        why = (
            "Profil ma sensowne dopasowanie — decyzja zależy od priorytetów roli i weryfikacji braków."
            if pl
            else "Profile shows solid fit — decision depends on role priorities and gap verification."
        )
    elif score >= 40:
        why = (
            "Profil ma częściowe dopasowanie — rozważ tylko jeśli brak lepszych kandydatów w kolejce."
            if pl
            else "Profile shows partial fit — consider only if no stronger candidates in queue."
        )
    else:
        why = (
            "Profil słabo pasuje do ogłoszenia — domyślnie odrzuć chyba że masz inne dowody jakości."
            if pl
            else "Profile weakly matches posting — default decline unless you have other quality signals."
        )

    disclaimer = (
        "Karta oceny jest pomocą opartą na regułach (nie decyzją AI). Rekruter zatwierdza każdy slot "
        "w kalendarzu. TWIN nie gwarantuje kwalifikacji kandydata."
        if pl
        else "Review card is rule-based guidance (not an AI hiring decision). Recruiter approves every "
        "calendar slot. TWIN does not guarantee candidate qualification."
    )

    return {
        "why_this_candidate": why,
        "requirements_matched": requirements_matched[:5],
        "uncertain_or_missing": uncertain_or_missing[:5],
        "what_to_verify": what_to_verify[:5],
        "data_confidence": _infer_data_confidence(candidate, job, score=score),
        "red_flags": red_flags[:4],
        "human_decision_required": True,
        "disclaimer": disclaimer,
    }


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
        "review_card": _build_recruiter_review_card(cand, jdict, score=score, locale=locale),
    }
