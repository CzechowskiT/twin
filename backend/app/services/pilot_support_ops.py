"""Epic 2.10 — candidate help, problem reports, feedback, support lifecycle, recovery."""

from __future__ import annotations

import json
import secrets
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import CandidatePilotFeedback, CandidateSupportCase
from app.services.diagnostic_envelope import build_preview_envelope
from app.services.pilot_runtime import runtime_snapshot

SCHEMA = "twin.pilot_support_ops/v1"

SUPPORT_STATUSES = frozenset(
    {
        "DRAFT",
        "SUBMITTED",
        "TRIAGED",
        "IN_PROGRESS",
        "WAITING_CANDIDATE",
        "RESOLVED",
        "CLOSED",
        "WITHDRAWN",
        "DELETED",
    }
)

# No silent closure — CLOSED requires closed_reason.
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "DRAFT": frozenset({"SUBMITTED", "WITHDRAWN", "DELETED"}),
    "SUBMITTED": frozenset({"TRIAGED", "IN_PROGRESS", "WITHDRAWN", "WAITING_CANDIDATE"}),
    "TRIAGED": frozenset({"IN_PROGRESS", "WAITING_CANDIDATE", "RESOLVED"}),
    "IN_PROGRESS": frozenset({"WAITING_CANDIDATE", "RESOLVED", "CLOSED"}),
    "WAITING_CANDIDATE": frozenset({"IN_PROGRESS", "RESOLVED", "WITHDRAWN"}),
    "RESOLVED": frozenset({"CLOSED", "DELETED"}),
    "CLOSED": frozenset({"DELETED"}),
    "WITHDRAWN": frozenset({"DELETED"}),
    "DELETED": frozenset(),
}

PROBLEM_CATEGORIES = frozenset(
    {
        "access",
        "privacy",
        "invite",
        "onboarding",
        "daily_os",
        "bug",
        "data",
        "other",
    }
)

FEEDBACK_CATEGORIES = frozenset({"ux", "clarity", "usefulness", "trust", "other"})

INJECTION_MARKERS = (
    "ignore previous",
    "system prompt",
    "<%",
    "{{",
    "<script",
    "javascript:",
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _scrub_text(text: str | None, *, max_len: int = 2000) -> str:
    t = (text or "").strip()[:max_len]
    low = t.lower()
    for m in INJECTION_MARKERS:
        if m in low:
            t = t.replace(m, "[filtered]").replace(m.upper(), "[filtered]")
    return t


def help_center_content(*, locale: str = "en") -> dict[str, Any]:
    pl = (locale or "en").lower().startswith("pl")
    articles = [
        {
            "id": "getting_started",
            "title": "Pierwsze kroki" if pl else "Getting started",
            "body": (
                "Zaloguj się, przejrzyj prywatność, dokończ krótki onboarding i otwórz Home/Today."
                if pl
                else "Sign in, review privacy, finish short onboarding, open Home/Today."
            ),
            "href": "/dashboard",
        },
        {
            "id": "privacy",
            "title": "Prywatność i eksport" if pl else "Privacy and export",
            "body": (
                "Centrum prywatności: pauza, eksport i usunięcie konta."
                if pl
                else "Privacy Center: pause, export, and account deletion."
            ),
            "href": "/dashboard/privacy-center",
        },
        {
            "id": "report_problem",
            "title": "Zgłoś problem" if pl else "Report a problem",
            "body": (
                "Opisz problem bez załączników i zrzutów ekranu. Możesz podejrzeć diagnostykę."
                if pl
                else "Describe the issue without attachments or screenshots. Preview diagnostics first."
            ),
            "href": "/dashboard/help/report-problem",
        },
        {
            "id": "feedback",
            "title": "Opinia" if pl else "Feedback",
            "body": (
                "Opinie są oddzielne od telemetrii i można je wycofać."
                if pl
                else "Feedback is separate from telemetry and can be withdrawn."
            ),
            "href": "/dashboard/help/feedback",
        },
    ]
    return {
        "schema": "twin.candidate_help_center/v1",
        "locale": "pl" if pl else "en",
        "articles": articles,
        "primary_nav": False,
        "placement": "more_and_settings",
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }


def recovery_guidance(*, journey: str = "home") -> list[dict[str, Any]]:
    catalog = {
        "home": [
            {"id": "open_home", "href": "/dashboard", "label": "Open Home"},
            {"id": "privacy", "href": "/dashboard/privacy-center", "label": "Privacy Center"},
        ],
        "onboarding": [
            {"id": "onboarding", "href": "/onboarding", "label": "Resume onboarding"},
            {"id": "home", "href": "/dashboard", "label": "Skip to Home"},
        ],
        "privacy": [
            {"id": "privacy", "href": "/dashboard/privacy-center", "label": "Privacy Center"},
            {"id": "export", "href": "/dashboard/privacy-center", "label": "Export / delete"},
        ],
        "invite": [
            {"id": "help", "href": "/dashboard/help", "label": "Help Center"},
            {"id": "report", "href": "/dashboard/help/report-problem", "label": "Report access issue"},
        ],
        "daily_os": [
            {"id": "home", "href": "/dashboard", "label": "Open Daily OS"},
            {"id": "report", "href": "/dashboard/help/report-problem", "label": "Report Daily OS issue"},
        ],
    }
    return catalog.get(journey, catalog["home"])


def create_problem_report(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    category: str,
    subject: str,
    body_text: str | None,
    diagnostic_raw: dict[str, Any] | None,
    diagnostic_opt_in: bool,
    locale: str = "en",
) -> dict[str, Any]:
    snap = runtime_snapshot(db)
    if not snap["kill_switches"]["support_enabled"] or snap["state"] in (
        "DISABLED",
        "INCIDENT_LOCKDOWN",
    ):
        return {"ok": False, "reason": "support_disabled", "kpi_excluded": True}
    cat = (category or "other").strip().lower()
    if cat not in PROBLEM_CATEGORIES:
        cat = "other"
    preview = build_preview_envelope(diagnostic_raw, opt_in=diagnostic_opt_in)
    case_key = f"prob_{secrets.token_hex(8)}"
    row = CandidateSupportCase(
        candidate_id=candidate_id,
        user_id=user_id,
        case_key=case_key,
        kind="problem",
        category=cat,
        status="SUBMITTED",
        subject=_scrub_text(subject, max_len=200) or "Problem report",
        body_text=_scrub_text(body_text),
        diagnostic_opt_in=bool(diagnostic_opt_in),
        diagnostic_json=json.dumps(preview["included"] if diagnostic_opt_in else {}),
        recovery_json=json.dumps(recovery_guidance(journey=cat if cat in ("invite", "daily_os", "privacy", "onboarding") else "home")),
        created_at=_utcnow(),
        updated_at=_utcnow(),
        kpi_excluded=True,
        claim_kind="FACT",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "case": _case_out(row),
        "diagnostic_preview": preview,
        "help": help_center_content(locale=locale),
        "kpi_excluded": True,
    }


def create_feedback(
    db: Session,
    *,
    candidate_id: int,
    user_id: int,
    category: str,
    message: str | None,
    rating: int | None,
    page_path: str | None,
) -> dict[str, Any]:
    cat = (category or "other").strip().lower()
    if cat not in FEEDBACK_CATEGORIES:
        cat = "other"
    rating_v = None
    if rating is not None:
        rating_v = max(1, min(5, int(rating)))
    key = f"fb_{secrets.token_hex(8)}"
    row = CandidatePilotFeedback(
        candidate_id=candidate_id,
        user_id=user_id,
        feedback_key=key,
        category=cat,
        rating=rating_v,
        message=_scrub_text(message),
        page_path=(page_path or "")[:300] or None,
        status="SUBMITTED",
        used_for_ranking=False,
        used_for_training=False,
        created_at=_utcnow(),
        kpi_excluded=True,
        claim_kind="CANDIDATE_CONFIRMED",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "feedback": _feedback_out(row), "kpi_excluded": True}


def withdraw_feedback(db: Session, *, candidate_id: int, feedback_id: int) -> dict[str, Any]:
    row = (
        db.query(CandidatePilotFeedback)
        .filter(
            CandidatePilotFeedback.id == feedback_id,
            CandidatePilotFeedback.candidate_id == candidate_id,
            CandidatePilotFeedback.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        return {"ok": False, "reason": "not_found"}
    row.status = "WITHDRAWN"
    row.withdrawn_at = _utcnow()
    db.commit()
    return {"ok": True, "feedback": _feedback_out(row)}


def transition_case(
    db: Session,
    *,
    candidate_id: int,
    case_id: int,
    new_status: str,
    closed_reason: str | None = None,
    actor: str = "candidate",
) -> dict[str, Any]:
    row = (
        db.query(CandidateSupportCase)
        .filter(
            CandidateSupportCase.id == case_id,
            CandidateSupportCase.candidate_id == candidate_id,
            CandidateSupportCase.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        return {"ok": False, "reason": "not_found"}
    target = (new_status or "").strip().upper()
    allowed = ALLOWED_TRANSITIONS.get(row.status, frozenset())
    if target not in allowed:
        return {"ok": False, "reason": "illegal_transition", "from": row.status, "to": target}
    if target == "CLOSED" and not (closed_reason or "").strip():
        return {"ok": False, "reason": "closed_reason_required"}
    if target == "DELETED":
        row.deleted_at = _utcnow()
    if target == "WITHDRAWN":
        row.withdrawn_at = _utcnow()
    if target == "RESOLVED":
        row.resolved_at = _utcnow()
    if target == "CLOSED":
        row.closed_reason = _scrub_text(closed_reason, max_len=120)
    row.status = target
    row.updated_at = _utcnow()
    _ = actor
    db.commit()
    db.refresh(row)
    return {"ok": True, "case": _case_out(row)}


def list_cases(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidateSupportCase)
        .filter(
            CandidateSupportCase.candidate_id == candidate_id,
            CandidateSupportCase.deleted_at.is_(None),
            CandidateSupportCase.status != "DELETED",
        )
        .order_by(CandidateSupportCase.id.desc())
        .limit(50)
        .all()
    )
    return [_case_out(r) for r in rows]


def list_feedback(db: Session, *, candidate_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(CandidatePilotFeedback)
        .filter(
            CandidatePilotFeedback.candidate_id == candidate_id,
            CandidatePilotFeedback.deleted_at.is_(None),
        )
        .order_by(CandidatePilotFeedback.id.desc())
        .limit(50)
        .all()
    )
    return [_feedback_out(r) for r in rows]


def soft_delete_all_for_candidate(db: Session, *, candidate_id: int) -> dict[str, int]:
    now = _utcnow()
    n_cases = 0
    for row in (
        db.query(CandidateSupportCase)
        .filter(
            CandidateSupportCase.candidate_id == candidate_id,
            CandidateSupportCase.deleted_at.is_(None),
        )
        .all()
    ):
        row.status = "DELETED"
        row.deleted_at = now
        n_cases += 1
    n_fb = 0
    for row in (
        db.query(CandidatePilotFeedback)
        .filter(
            CandidatePilotFeedback.candidate_id == candidate_id,
            CandidatePilotFeedback.deleted_at.is_(None),
        )
        .all()
    ):
        row.status = "DELETED"
        row.deleted_at = now
        n_fb += 1
    db.commit()
    return {"support_cases_deleted": n_cases, "feedback_deleted": n_fb}


def export_for_candidate(db: Session, *, candidate_id: int) -> dict[str, Any]:
    return {
        "support_cases": list_cases(db, candidate_id=candidate_id),
        "pilot_feedback": [
            f for f in list_feedback(db, candidate_id=candidate_id) if f.get("status") != "DELETED"
        ],
    }


def _case_out(row: CandidateSupportCase) -> dict[str, Any]:
    return {
        "id": row.id,
        "case_key": row.case_key,
        "kind": row.kind,
        "category": row.category,
        "status": row.status,
        "subject": row.subject,
        "diagnostic_opt_in": bool(row.diagnostic_opt_in),
        "has_diagnostic": bool(row.diagnostic_json and row.diagnostic_json != "{}"),
        "recovery": json.loads(row.recovery_json or "[]"),
        "closed_reason": row.closed_reason,
        "created_at": row.created_at.isoformat() + "Z" if row.created_at else None,
        "kpi_excluded": True,
    }


def _feedback_out(row: CandidatePilotFeedback) -> dict[str, Any]:
    return {
        "id": row.id,
        "feedback_key": row.feedback_key,
        "category": row.category,
        "rating": row.rating,
        "message": row.message,
        "page_path": row.page_path,
        "status": row.status,
        "used_for_ranking": False,
        "used_for_training": False,
        "withdrawn_at": row.withdrawn_at.isoformat() + "Z" if row.withdrawn_at else None,
        "kpi_excluded": True,
    }
