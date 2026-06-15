"""Recruiter Talent Radar — resurface known candidates from internal workspace context."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.database.models import (
    Application,
    ApplicationStatus,
    Candidate,
    Job,
    RecruiterApplicationScorecard,
)
from app.services.recruiter_candidate_search import (
    SEARCHABLE_STATUSES,
    _effective_pipeline_status,
    _parse_skills,
    _search_application_row,
)
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_jobs import list_company_jobs
from app.services.recruiter_match_explanations import INBOX_FORBIDDEN_PII_KEYS
from app.services.recruiter_talent_radar_decisions import latest_decisions_by_application
from app.services.recruiter_talent_pool import list_talent_pool_records_for_radar
from app.utils.slug import slugify_company

FitLabel = Literal["strong", "good", "possible", "weak"]
RadarStatus = Literal[
    "ready_to_review",
    "needs_verification",
    "consent_check_required",
    "stale_data",
    "not_enough_evidence",
]
NextAction = Literal[
    "open_review_card",
    "prepare_outreach_draft",
    "add_to_shortlist",
    "verify_data",
    "snooze",
]
DataConfidence = Literal["high", "medium", "low"]

RADAR_DISCLAIMER_EN = (
    "Talent Radar surfaces signals and context. The recruiter decides whether and how to contact the candidate."
)
RADAR_DISCLAIMER_PL = (
    "Radar Talentów pokazuje sygnały i kontekst. Decyzję o kontakcie podejmuje rekruter."
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _days_since(dt: datetime | None) -> int | None:
    if not dt:
        return None
    aware = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return max(0, (_utc_now() - aware).days)


def _fit_label(score: float) -> FitLabel:
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 45:
        return "possible"
    return "weak"


def _headline(cand: Candidate) -> str | None:
    titles = _parse_skills(cand.preferred_job_titles)
    if titles:
        return titles[0].title()
    skills = _parse_skills(cand.skills)
    if skills:
        return f"{skills[0].title()} professional"
    return None


def _data_confidence(card: dict[str, Any]) -> DataConfidence:
    raw = (card.get("data_confidence") or "unknown").lower()
    if raw in ("high", "medium", "low"):
        return raw  # type: ignore[return-value]
    return "low"


def _radar_status(
    *,
    score: float,
    confidence: DataConfidence,
    days_idle: int | None,
    uncertain: list[str],
    pipeline: str,
) -> RadarStatus:
    if confidence == "low" or len(uncertain) >= 3:
        return "not_enough_evidence"
    if days_idle is not None and days_idle >= 180:
        return "stale_data"
    if pipeline == "rejected" and score < 55:
        return "needs_verification"
    if pipeline == "rejected":
        return "consent_check_required"
    return "ready_to_review"


def _recommended_action(status: RadarStatus, pipeline: str) -> NextAction:
    if status in ("not_enough_evidence", "stale_data", "needs_verification"):
        return "verify_data"
    if pipeline in ("accepted", "to_contact", "invited"):
        return "prepare_outreach_draft"
    if pipeline in ("review", "new"):
        return "open_review_card"
    if pipeline in ("on_hold",):
        return "snooze"
    return "add_to_shortlist"


def _skill_overlap(cand: Candidate, job: Job) -> list[str]:
    skills = _parse_skills(cand.skills)
    req = f"{job.requirements or ''} {job.description or ''}".lower()
    return [s for s in skills[:12] if s in req][:5]


def _compute_radar_row(
    db: Session,
    app: Application,
    job: Job,
    cand: Candidate,
    scorecard: RecruiterApplicationScorecard | None,
    *,
    locale: str,
    role_job: Job | None,
) -> dict[str, Any]:
    pl = locale.lower().startswith("pl")
    base = _search_application_row(db, app, job, cand, locale=locale)
    card = base.get("review_card") or {}
    uncertain = card.get("uncertain_or_missing") or []
    pipeline = _effective_pipeline_status(app)
    match_score = float(base.get("match_score") or 0)
    overlap = _skill_overlap(cand, role_job or job)
    days_idle = _days_since(app.updated_at or app.applied_at)
    confidence = _data_confidence(card)

    score = match_score
    if overlap:
        score += min(12, len(overlap) * 4)
    if pipeline in ("accepted", "to_contact", "invited"):
        score += 10
    if pipeline == "on_hold":
        score += 4
    if scorecard and (scorecard.rating or 0) >= 4:
        score += 8
    if days_idle is not None and days_idle >= 90:
        score += 6
    if uncertain:
        score -= min(15, len(uncertain) * 4)
    if confidence == "low":
        score -= 8
    if pipeline == "rejected":
        score -= 12
    score = max(0.0, min(100.0, score))

    why_surfaced: list[str] = []
    if overlap:
        why_surfaced.append(
            f"Nakładanie umiejętności: {', '.join(overlap[:3])}" if pl else f"Skill overlap: {', '.join(overlap[:3])}"
        )
    reasons = base.get("match_reasons") or []
    why_surfaced.extend(reasons[:2])
    if pipeline in ("accepted", "to_contact", "invited"):
        why_surfaced.append(
            "Wcześniej zaakceptowany lub zaproszony w workspace" if pl else "Previously accepted or invited in workspace"
        )
    if scorecard and scorecard.rating:
        why_surfaced.append(
            f"Scorecard rekrutera: {scorecard.rating}/5" if pl else f"Recruiter scorecard: {scorecard.rating}/5"
        )
    if not why_surfaced:
        why_surfaced.append(
            "Kandydat znany z historii aplikacji w workspace" if pl else "Known from workspace application history"
        )

    why_now: list[str] = []
    if days_idle is not None and days_idle >= 30:
        why_now.append(
            f"Brak kontaktu od {days_idle} dni — okno na ponowne rozważenie"
            if pl
            else f"No contact for {days_idle} days — window to reconsider"
        )
    if role_job and job.id != role_job.id:
        why_now.append(
            "Nowy kontekst roli może zmienić dopasowanie" if pl else "New role context may change fit"
        )
    if not why_now:
        why_now.append(
            "Brak silnego sygnału czasowego — pokazany z powodu dopasowania kontekstu"
            if pl
            else "No strong timing signal — shown for contextual fit"
        )

    evidence = list(why_surfaced[:3])
    if base.get("match_score_label"):
        evidence.append(str(base["match_score_label"]))

    risks: list[str] = []
    if uncertain:
        risks.append(
            f"Braki danych: {', '.join(str(u) for u in uncertain[:3])}"
            if pl
            else f"Data gaps: {', '.join(str(u) for u in uncertain[:3])}"
        )
    if pipeline == "rejected":
        risks.append("Wcześniejsza odmowa w pipeline" if pl else "Prior rejection in pipeline")
    if confidence == "low":
        risks.append("Niska pewność danych" if pl else "Low data confidence")
    if not risks:
        risks.append("Wymaga ludzkiej oceny przed kontaktem" if pl else "Requires human review before contact")

    missing = [str(u) for u in uncertain[:5]]
    if not missing and confidence != "high":
        missing.append("Pełny profil do weryfikacji" if pl else "Full profile pending verification")

    status = _radar_status(
        score=score,
        confidence=confidence,
        days_idle=days_idle,
        uncertain=uncertain,
        pipeline=pipeline,
    )
    last_ix = (app.updated_at or app.applied_at)
    last_label = last_ix.isoformat() if last_ix else None

    return {
        "id": str(app.id),
        "application_id": app.id,
        "display_name": (cand.name or "").strip() or ("Kandydat" if pl else "Candidate"),
        "headline": _headline(cand),
        "fit_label": _fit_label(score),
        "score": round(score, 1),
        "status": status,
        "why_surfaced": why_surfaced,
        "why_now": why_now,
        "evidence": evidence,
        "risks": risks,
        "missing_data": missing,
        "last_interaction": last_label,
        "recommended_next_action": _recommended_action(status, pipeline),
        "data_confidence": confidence,
        "human_decision_required": True,
        "pipeline_status": pipeline,
        "job_title": job.title,
        "days_since_contact": days_idle,
        "skill_overlap": overlap,
        "source": "workspace_application",
        "source_signals": ["workspace"],
    }


def _compute_pool_radar_row(
    rec,
    *,
    locale: str,
    role_job: Job | None,
) -> dict[str, Any]:
    import json

    pl = locale.lower().startswith("pl")
    skills: list[str] = []
    if rec.skills_json:
        try:
            loaded = json.loads(rec.skills_json)
            if isinstance(loaded, list):
                skills = [str(s) for s in loaded[:12]]
        except json.JSONDecodeError:
            skills = []
    quality: dict[str, Any] = {}
    if rec.data_quality_json:
        try:
            loaded = json.loads(rec.data_quality_json)
            if isinstance(loaded, dict):
                quality = loaded
        except json.JSONDecodeError:
            quality = {}
    level = str(quality.get("level") or "medium")
    confidence: DataConfidence = level if level in ("high", "medium", "low") else "medium"  # type: ignore[assignment]
    score = float(quality.get("score") or 55)
    if role_job and rec.job_title:
        req = f"{role_job.requirements or ''} {role_job.description or ''}".lower()
        overlap = [s for s in skills if s.lower() in req][:5]
        if overlap:
            score += min(15, len(overlap) * 4)
    score = max(0.0, min(100.0, score))
    warnings = quality.get("warnings") or []
    why_surfaced = [
        "Import z wewnętrznego talent pool" if pl else "Imported from internal talent pool",
    ]
    if skills:
        why_surfaced.append(
            f"Umiejętności: {', '.join(skills[:3])}" if pl else f"Skills: {', '.join(skills[:3])}"
        )
    if rec.job_title:
        why_surfaced.append(rec.job_title)
    why_now = [
        "Świeży rekord z importu CSV — zweryfikuj przed kontaktem"
        if pl
        else "Fresh CSV import record — verify before contact"
    ]
    risks: list[str] = []
    if warnings:
        risks.append(
            f"Ostrzeżenia jakości: {', '.join(str(w) for w in warnings[:3])}"
            if pl
            else f"Data quality warnings: {', '.join(str(w) for w in warnings[:3])}"
        )
    if confidence != "high":
        risks.append("Niska pewność danych importu" if pl else "Low import data confidence")
    if not risks:
        risks.append("Wymaga ludzkiej oceny przed kontaktem" if pl else "Requires human review before contact")
    missing = [str(w) for w in warnings[:5]]
    status = _radar_status(
        score=score,
        confidence=confidence,
        days_idle=None,
        uncertain=missing,
        pipeline=(rec.pipeline_status or "review"),
    )
    return {
        "id": f"pool-{rec.id}",
        "application_id": rec.application_id,
        "display_name": rec.display_name,
        "headline": rec.job_title or (skills[0].title() if skills else None),
        "fit_label": _fit_label(score),
        "score": round(score, 1),
        "status": status,
        "why_surfaced": why_surfaced,
        "why_now": why_now,
        "evidence": why_surfaced[:3],
        "risks": risks,
        "missing_data": missing,
        "last_interaction": rec.created_at.isoformat() if rec.created_at else None,
        "recommended_next_action": "verify_data",
        "data_confidence": confidence,
        "human_decision_required": True,
        "pipeline_status": rec.pipeline_status or "review",
        "job_title": rec.job_title,
        "days_since_contact": None,
        "skill_overlap": skills[:5],
        "source": "imported_internal_pool",
        "source_signals": ["imported_internal_pool", "talent_pool"],
    }


def _matches_segment(row: dict[str, Any], segment: str | None) -> bool:
    seg = (segment or "all_known").strip().lower()
    pipe = (row.get("pipeline_status") or "").lower()
    if seg in ("", "all_known", "all"):
        return True
    if seg == "previously_shortlisted":
        return pipe in ("accepted", "to_contact", "on_hold")
    if seg == "previously_invited":
        return pipe == "invited"
    if seg == "rejected_strong_signal":
        return pipe == "rejected" and float(row.get("score") or 0) >= 50
    if seg == "inactive_stale":
        days = row.get("days_since_contact")
        return days is not None and days >= 90
    if seg == "high_evidence_quality":
        return row.get("data_confidence") == "high"
    if seg == "possible_gaps":
        return bool(row.get("missing_data"))
    if seg == "imported_internal_pool":
        return row.get("source") == "imported_internal_pool"
    return True


def _matches_timing(row: dict[str, Any], timing: str | None) -> bool:
    tw = (timing or "all").strip().lower()
    days = row.get("days_since_contact")
    if tw in ("", "all"):
        return True
    if tw == "never_reviewed_role":
        return days is None
    thresholds = {"no_contact_30": 30, "no_contact_90": 90, "no_contact_180": 180}
    need = thresholds.get(tw)
    if need is None:
        return True
    return days is not None and days >= need


def _matches_signal(row: dict[str, Any], signal: str | None) -> bool:
    sig = (signal or "all").strip().lower()
    if sig in ("", "all"):
        return True
    if sig == "skill_match":
        return bool(row.get("skill_overlap"))
    if sig == "previous_shortlist":
        return (row.get("pipeline_status") or "") in ("accepted", "to_contact", "on_hold")
    if sig == "similar_role_history":
        return bool(row.get("why_surfaced"))
    if sig == "scorecard_signal":
        return any("scorecard" in w.lower() or "Scorecard" in w for w in row.get("why_surfaced") or [])
    if sig == "evidence_completeness":
        return row.get("data_confidence") == "high"
    if sig == "location_fit":
        return any("location" in w.lower() or "lokaliz" in w.lower() for w in row.get("why_surfaced") or [])
    if sig == "seniority_fit":
        return bool(row.get("headline"))
    if sig == "needs_verification":
        return row.get("status") in ("needs_verification", "not_enough_evidence", "stale_data")
    if sig == "imported_internal_pool":
        return row.get("source") == "imported_internal_pool"
    return True


def build_recruiter_talent_radar(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
    role_id: int | None = None,
    segment: str | None = None,
    timing_window: str | None = None,
    signal_type: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    """Return explainable resurfacing suggestions for known workspace candidates."""
    slug = _require_company_slug(company_slug)
    pl = locale.lower().startswith("pl")
    role_job: Job | None = None
    if role_id:
        role_job = db.query(Job).filter(Job.id == role_id).first()

    jobs = list_company_jobs(db, company_slug=slug, limit=50)
    rows_q = (
        db.query(Application, Job, Candidate)
        .join(Job, Application.job_id == Job.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .filter(Application.status.in_(SEARCHABLE_STATUSES))
        .order_by(Application.updated_at.desc())
        .limit(400)
        .all()
    )

    suggestions: list[dict[str, Any]] = []
    warnings: list[str] = []
    for app, job, cand in rows_q:
        if slugify_company(job.company) != slug:
            continue
        if role_job and job.id != role_job.id and role_id:
            continue
        sc = (
            db.query(RecruiterApplicationScorecard)
            .filter(
                RecruiterApplicationScorecard.application_id == app.id,
                RecruiterApplicationScorecard.company_slug == slug,
            )
            .first()
        )
        row = _compute_radar_row(
            db, app, job, cand, sc, locale=locale, role_job=role_job
        )
        if not _matches_segment(row, segment):
            continue
        if not _matches_timing(row, timing_window):
            continue
        if not _matches_signal(row, signal_type):
            continue
        for forbidden in INBOX_FORBIDDEN_PII_KEYS:
            row.pop(forbidden, None)
        suggestions.append(row)

    pool_records = list_talent_pool_records_for_radar(db, company_slug=slug, limit=100)
    linked_app_ids = {int(s.get("application_id") or 0) for s in suggestions if s.get("application_id")}
    for rec in pool_records:
        if rec.application_id and rec.application_id in linked_app_ids:
            continue
        row = _compute_pool_radar_row(rec, locale=locale, role_job=role_job)
        if not _matches_segment(row, segment):
            continue
        if not _matches_timing(row, timing_window):
            continue
        if not _matches_signal(row, signal_type):
            continue
        for forbidden in INBOX_FORBIDDEN_PII_KEYS:
            row.pop(forbidden, None)
        suggestions.append(row)

    suggestions.sort(key=lambda r: float(r.get("score") or 0), reverse=True)
    suggestions = suggestions[:limit]

    app_ids = [int(s["application_id"]) for s in suggestions if s.get("application_id")]
    latest = latest_decisions_by_application(db, company_slug=slug, application_ids=app_ids)
    for row in suggestions:
        app_id = int(row.get("application_id") or 0)
        decision = latest.get(app_id)
        row["latest_decision"] = decision

    if not jobs:
        warnings.append(
            "Brak ról pracodawcy — używany kontekst z aplikacji (demo/pilot)."
            if pl
            else "No employer roles found — using application context (demo/pilot)."
        )
    if not suggestions:
        warnings.append(
            "Za mało sygnałów wewnętrznych dla wybranych filtrów."
            if pl
            else "Not enough internal signals for selected filters."
        )

    return {
        "company_slug": slug,
        "suggestions": suggestions,
        "summary": {
            "total": len(suggestions),
            "scope": "internal_workspace",
            "external_sourcing_connected": False,
            "pilot": True,
        },
        "filters": {
            "role_id": role_id,
            "segment": segment or "all_known",
            "timing_window": timing_window or "all",
            "signal_type": signal_type or "all",
            "roles": jobs,
        },
        "data_quality_warnings": warnings,
        "generated_at": _utc_now().isoformat(),
        "disclaimer": RADAR_DISCLAIMER_PL if pl else RADAR_DISCLAIMER_EN,
    }
