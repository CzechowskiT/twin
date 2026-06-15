"""Weekly Talent Radar Digest — operational summary for recruiter review (no email send)."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.database.models import Application, Job, RecruiterTalentRadarDecision
from app.services.recruiter_inbox import _require_company_slug
from app.services.recruiter_jobs import list_company_jobs
from app.services.recruiter_match_explanations import INBOX_FORBIDDEN_PII_KEYS
from app.services.recruiter_talent_radar import (
    RADAR_DISCLAIMER_EN,
    RADAR_DISCLAIMER_PL,
    build_recruiter_talent_radar,
)
from app.services.recruiter_talent_radar_decisions import (
    _effective_decision_state,
    _serialize_decision,
    latest_decisions_by_application,
)
from app.utils.slug import slugify_company

DigestPeriod = Literal["7d", "30d", "week"]
FOLLOW_UP_THRESHOLD_DAYS = 3
SNOOZE_RETURN_WINDOW_DAYS = 7
SHORTLIST_FOLLOW_UP_ACTIONS = frozenset(
    {"draft_prepared", "review_card_opened", "dismissed", "snoozed"}
)
DISMISS_REASON_LABELS_EN = {
    "wrong_role": "Not relevant to role",
    "low_fit": "Low fit",
    "timing": "Timing",
    "already_contacted": "Already contacted",
    "other": "Other",
}
DISMISS_REASON_LABELS_PL = {
    "wrong_role": "Nietrafiony do roli",
    "low_fit": "Niskie dopasowanie",
    "timing": "Zły moment",
    "already_contacted": "Już skontaktowany",
    "other": "Inne",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_period(period: str | None) -> tuple[datetime, datetime, str]:
    now = _utc_now()
    key = (period or "7d").strip().lower()
    if key == "week":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        label = "this_week"
    elif key == "30d":
        start = now - timedelta(days=30)
        label = "last_30_days"
    else:
        start = now - timedelta(days=7)
        label = "last_7_days"
    return start, now, label


def _period_label_text(label_key: str, locale: str) -> str:
    pl = locale.lower().startswith("pl")
    if label_key == "this_week":
        return "Ten tydzień" if pl else "This week"
    if label_key == "last_30_days":
        return "Ostatnie 30 dni" if pl else "Last 30 days"
    return "Ostatnie 7 dni" if pl else "Last 7 days"


def _in_period(dt: datetime | None, start: datetime, end: datetime) -> bool:
    if not dt:
        return False
    aware = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return start <= aware <= end


def _to_digest_candidate(
    row: dict[str, Any],
    *,
    locale: str,
    latest_decision: dict | None = None,
    recommended: str | None = None,
) -> dict[str, Any]:
    decision = latest_decision or row.get("latest_decision")
    latest_payload: dict[str, Any] | None = None
    if decision:
        meta = decision.get("meta") or {}
        latest_payload = {
            "actionType": decision.get("action_type"),
            "createdAt": decision.get("created_at"),
            "reason": meta.get("dismiss_reason_code"),
            "snoozeUntil": decision.get("snooze_until"),
        }
    out: dict[str, Any] = {
        "candidateId": str(row.get("id") or row.get("application_id")),
        "applicationId": str(row.get("application_id") or row.get("id")),
        "displayName": row.get("display_name") or ("Kandydat" if locale.lower().startswith("pl") else "Candidate"),
        "headline": row.get("headline"),
        "roleTitle": row.get("job_title"),
        "fitLabel": row.get("fit_label"),
        "score": row.get("score"),
        "whyNow": row.get("why_now") or [],
        "latestDecision": latest_payload,
        "recommendedNextAction": recommended or row.get("recommended_next_action") or "open_review_card",
        "dataConfidence": row.get("data_confidence"),
    }
    for forbidden in INBOX_FORBIDDEN_PII_KEYS:
        out.pop(forbidden, None)
    return out


def _decisions_in_period(
    db: Session,
    *,
    company_slug: str,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(RecruiterTalentRadarDecision)
        .filter(RecruiterTalentRadarDecision.company_slug == slug)
        .order_by(RecruiterTalentRadarDecision.created_at.desc())
        .limit(500)
        .all()
    )
    out: list[dict[str, Any]] = []
    for row in rows:
        created = row.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if not _in_period(created, start, end):
            continue
        out.append(_serialize_decision(row))
    return out


def _latest_decision_per_app(
    db: Session,
    *,
    company_slug: str,
    application_ids: list[int],
) -> dict[int, dict]:
    return latest_decisions_by_application(db, company_slug=company_slug, application_ids=application_ids)


def _later_actions_after(
    db: Session,
    *,
    company_slug: str,
    application_id: int,
    after: datetime,
) -> list[dict]:
    slug = _require_company_slug(company_slug)
    rows = (
        db.query(RecruiterTalentRadarDecision)
        .filter(
            RecruiterTalentRadarDecision.company_slug == slug,
            RecruiterTalentRadarDecision.application_id == application_id,
        )
        .order_by(RecruiterTalentRadarDecision.created_at.asc())
        .all()
    )
    out: list[dict] = []
    for row in rows:
        created = row.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created and created > after:
            out.append(_serialize_decision(row))
    return out


def _build_narrative(
    *,
    summary: dict[str, int],
    locale: str,
) -> str:
    pl = locale.lower().startswith("pl")
    review = summary.get("candidatesToReview", 0)
    snooze = summary.get("returningFromSnooze", 0)
    shortlist = summary.get("shortlistedWithoutFollowUp", 0)
    drafts = summary.get("draftsPreparedNotSent", 0)
    if pl:
        return (
            f"W tym okresie Radar Talentów wskazał {review} kandydatów do sprawdzenia. "
            f"{snooze} osób wraca po snooze, a {shortlist} z shortlisty nie ma jeszcze follow-upu. "
            f"Przygotowano {drafts} szkiców — żaden nie został wysłany. "
            "TWIN nie wysłał żadnej wiadomości — decyzje i kontakt pozostają po stronie rekrutera."
        )
    return (
        f"In this period Talent Radar flagged {review} candidates to review. "
        f"{snooze} are returning from snooze and {shortlist} shortlisted candidates lack follow-up. "
        f"{drafts} drafts were prepared — none were sent. "
        "TWIN did not send any message — contact decisions remain with the recruiter."
    )


def build_recruiter_talent_radar_digest(
    db: Session,
    *,
    company_slug: str,
    locale: str = "en",
    period: str | None = "7d",
    job_id: int | None = None,
    include_dismissed_summary: bool = True,
) -> dict[str, Any]:
    """Return weekly digest sections for recruiter review — dashboard only, no outreach."""
    slug = _require_company_slug(company_slug)
    pl = locale.lower().startswith("pl")
    start, end, label_key = _parse_period(period)
    now = _utc_now()

    radar = build_recruiter_talent_radar(
        db,
        company_slug=slug,
        locale=locale,
        role_id=job_id,
        limit=50,
    )
    suggestions = radar.get("suggestions") or []
    app_ids = [int(s["application_id"]) for s in suggestions if s.get("application_id")]
    latest_by_app = _latest_decision_per_app(db, company_slug=slug, application_ids=app_ids)

    period_decisions = _decisions_in_period(db, company_slug=slug, start=start, end=end)
    new_decision_count = len(period_decisions)

    review_first: list[dict] = []
    for row in suggestions:
        score = float(row.get("score") or 0)
        app_id = int(row.get("application_id") or 0)
        decision = latest_by_app.get(app_id)
        state = _effective_decision_state(decision, now=now) if decision else None
        confidence = row.get("data_confidence") or "low"
        if score < 60:
            continue
        if state in ("dismissed", "snoozed"):
            continue
        if confidence == "low" and len(row.get("missing_data") or []) >= 3:
            continue
        review_first.append(_to_digest_candidate(row, locale=locale, latest_decision=decision))

    returning_from_snooze: list[dict] = []
    snooze_cutoff = now + timedelta(days=SNOOZE_RETURN_WINDOW_DAYS)
    snoozed_apps = (
        db.query(RecruiterTalentRadarDecision)
        .filter(
            RecruiterTalentRadarDecision.company_slug == slug,
            RecruiterTalentRadarDecision.action_type == "snoozed",
        )
        .order_by(RecruiterTalentRadarDecision.created_at.desc())
        .limit(200)
        .all()
    )
    seen_snooze: set[int] = set()
    for row in snoozed_apps:
        app_id = row.application_id
        if app_id in seen_snooze:
            continue
        serialized = _serialize_decision(row)
        state = _effective_decision_state(serialized, now=now)
        if state != "snoozed":
            continue
        until = row.snooze_until
        if until and until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)
        if until and until > snooze_cutoff:
            continue
        seen_snooze.add(app_id)
        sug = next((s for s in suggestions if int(s.get("application_id") or 0) == app_id), None)
        if sug:
            returning_from_snooze.append(
                _to_digest_candidate(
                    sug,
                    locale=locale,
                    latest_decision=serialized,
                    recommended="open_review_card",
                )
            )
        else:
            app_job = (
                db.query(Application, Job)
                .join(Job, Application.job_id == Job.id)
                .filter(Application.id == app_id)
                .first()
            )
            if app_job and slugify_company(app_job[1].company) == slug:
                returning_from_snooze.append(
                    {
                        "candidateId": str(app_id),
                        "applicationId": str(app_id),
                        "displayName": "Kandydat" if pl else "Candidate",
                        "roleTitle": app_job[1].title,
                        "latestDecision": {
                            "actionType": "snoozed",
                            "createdAt": serialized.get("created_at"),
                            "snoozeUntil": serialized.get("snooze_until"),
                        },
                        "recommendedNextAction": "open_review_card",
                        "whyNow": [],
                    }
                )

    shortlisted_without_follow_up: list[dict] = []
    shortlist_rows = (
        db.query(RecruiterTalentRadarDecision)
        .filter(
            RecruiterTalentRadarDecision.company_slug == slug,
            RecruiterTalentRadarDecision.action_type == "shortlisted",
        )
        .order_by(RecruiterTalentRadarDecision.created_at.desc())
        .limit(200)
        .all()
    )
    seen_shortlist: set[int] = set()
    follow_threshold = now - timedelta(days=FOLLOW_UP_THRESHOLD_DAYS)
    for row in shortlist_rows:
        app_id = row.application_id
        if app_id in seen_shortlist:
            continue
        created = row.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if not created or created > follow_threshold:
            continue
        latest = _latest_decision_per_app(db, company_slug=slug, application_ids=[app_id]).get(app_id)
        if not latest or latest.get("action_type") != "shortlisted":
            continue
        later = _later_actions_after(db, company_slug=slug, application_id=app_id, after=created)
        if any(d.get("action_type") in SHORTLIST_FOLLOW_UP_ACTIONS for d in later):
            continue
        seen_shortlist.add(app_id)
        sug = next((s for s in suggestions if int(s.get("application_id") or 0) == app_id), None)
        if sug:
            shortlisted_without_follow_up.append(
                _to_digest_candidate(
                    sug,
                    locale=locale,
                    latest_decision=latest,
                    recommended="prepare_outreach_draft",
                )
            )

    dismissed_patterns: list[dict] = []
    if include_dismissed_summary:
        reason_counts: Counter[str] = Counter()
        for d in period_decisions:
            if d.get("action_type") != "dismissed":
                continue
            meta = d.get("meta") or {}
            code = meta.get("dismiss_reason_code") or "other"
            reason_counts[code] += 1
        labels = DISMISS_REASON_LABELS_PL if pl else DISMISS_REASON_LABELS_EN
        for code, count in reason_counts.most_common():
            dismissed_patterns.append(
                {
                    "reasonCode": code,
                    "label": labels.get(code, code),
                    "count": count,
                }
            )

    jobs = list_company_jobs(db, company_slug=slug, limit=50)
    low_coverage_roles: list[dict] = []
    role_counts: dict[int, list[dict]] = {}
    for s in suggestions:
        jid = None
        for j in jobs:
            if j.title == s.get("job_title"):
                jid = j.id
                break
        key = jid or 0
        role_counts.setdefault(key, []).append(s)

    for job in jobs:
        if job_id and job.id != job_id:
            continue
        rows_for_job = role_counts.get(job.id, [])
        low_conf = sum(1 for r in rows_for_job if r.get("data_confidence") == "low")
        missing_heavy = sum(1 for r in rows_for_job if len(r.get("missing_data") or []) >= 2)
        dismissed_for_role = sum(
            1
            for d in period_decisions
            if d.get("action_type") == "dismissed"
            and (d.get("meta") or {}).get("job_id") == str(job.id)
        )
        if len(rows_for_job) >= 3 and low_conf < len(rows_for_job) // 2 and missing_heavy < 2:
            continue
        warning = (
            "Mało kandydatów w radarze dla tej roli"
            if len(rows_for_job) < 3
            else "Niska pewność danych lub wiele braków"
        )
        if not pl:
            warning = (
                "Few radar candidates for this role"
                if len(rows_for_job) < 3
                else "Low data confidence or many gaps"
            )
        low_coverage_roles.append(
            {
                "jobId": str(job.id),
                "roleTitle": job.title,
                "candidateCount": len(rows_for_job),
                "coverageWarning": warning,
                "recommendedNextAction": "refine_role_criteria",
            }
        )

    drafts_prepared: list[dict] = []
    for d in period_decisions:
        if d.get("action_type") != "draft_prepared":
            continue
        app_id = int(d.get("application_id") or 0)
        sug = next((s for s in suggestions if int(s.get("application_id") or 0) == app_id), None)
        if sug:
            item = _to_digest_candidate(sug, locale=locale, latest_decision=d, recommended="open_review_card")
        else:
            item = {
                "candidateId": str(app_id),
                "applicationId": str(app_id),
                "displayName": "Kandydat" if pl else "Candidate",
                "latestDecision": {
                    "actionType": "draft_prepared",
                    "createdAt": d.get("created_at"),
                },
                "recommendedNextAction": "open_review_card",
                "whyNow": [],
            }
        item["status"] = "not_sent"
        drafts_prepared.append(item)

    summary = {
        "candidatesToReview": len(review_first),
        "returningFromSnooze": len(returning_from_snooze),
        "shortlistedWithoutFollowUp": len(shortlisted_without_follow_up),
        "newRadarDecisions": new_decision_count,
        "lowCoverageRoles": len(low_coverage_roles),
        "draftsPreparedNotSent": len(drafts_prepared),
    }

    warnings = list(radar.get("data_quality_warnings") or [])
    if not suggestions and not period_decisions:
        warnings.append(
            "Za mało danych radaru na digest — podejmij decyzje w Radarze Talentów."
            if pl
            else "Not enough radar data for digest — make decisions in Talent Radar first."
        )

    return {
        "period": {
            "label": _period_label_text(label_key, locale),
            "from": start.isoformat(),
            "to": end.isoformat(),
        },
        "summary": summary,
        "sections": {
            "reviewFirst": review_first[:15],
            "returningFromSnooze": returning_from_snooze[:15],
            "shortlistedWithoutFollowUp": shortlisted_without_follow_up[:15],
            "dismissedPatterns": dismissed_patterns,
            "lowCoverageRoles": low_coverage_roles[:10],
            "draftsPrepared": drafts_prepared[:15],
        },
        "narrative": _build_narrative(summary=summary, locale=locale),
        "dataQualityWarnings": warnings,
        "generatedAt": now.isoformat(),
        "disclaimer": RADAR_DISCLAIMER_PL if pl else RADAR_DISCLAIMER_EN,
        "companySlug": slug,
        "pilot": True,
        "emailSent": False,
        "automaticOutreach": False,
    }
