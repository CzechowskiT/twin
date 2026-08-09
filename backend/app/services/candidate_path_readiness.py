"""Epic 2.16 — candidate-selected path readiness + guided resolution routing.

Compose existing domains. Never recommend a best path. Never mutate editors.
Clicks ≠ first-value satisfaction. Data Trust handoff = route + recalculate only.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Candidate,
    CandidateAppStudioWorkspace,
    CandidateCareerEvidence,
    CandidateDataTrustReview,
    CandidateDecisionRecord,
    CandidateExecutionRequirement,
    CandidateInterviewProcess,
    CandidateLifecyclePrivacy,
    CandidateNormalizedOpportunity,
    CandidatePathReadinessSession,
)
from app.services.candidate_path_readiness_constants import (
    AUTO_CONTINUE_AFTER_DATA_TRUST,
    BANNED_COPY_PHRASES,
    CLICKS_EQUAL_SATISFACTION,
    CONTRACT_ID,
    EIGHTH_PRIMARY_NAV,
    FIRST_VALUE_CONTRACT,
    FIRST_VALUE_SATISFIED_BY_PATH_READINESS,
    MUTATES_ON_EVALUATE,
    OWNS_DAILY_OS_EXEC_CAL,
    OWNS_DATA_TRUST,
    OWNS_GFV_DEMO,
    OWNS_IMPORT,
    OWNS_SEARCH,
    PATH_KINDS,
    PERSON_EMPLOYABILITY_SCORES,
    RECOMMENDS_BEST_PATH,
    RESOLUTION_DEEP_LINKS,
    SCHEMA_ID,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _uuid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=str)


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return default


def _privacy_paused(db: Session, *, candidate_id: int) -> bool:
    row = (
        db.query(CandidateLifecyclePrivacy)
        .filter(CandidateLifecyclePrivacy.candidate_id == candidate_id)
        .one_or_none()
    )
    return bool(row and row.paused)


def catalog() -> dict[str, Any]:
    return {
        "schema_id": SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "first_value_contract": FIRST_VALUE_CONTRACT,
        "path_kinds": list(PATH_KINDS),
        "recommends_best_path": RECOMMENDS_BEST_PATH,
        "person_employability_scores": PERSON_EMPLOYABILITY_SCORES,
        "mutates_on_evaluate": MUTATES_ON_EVALUATE,
        "clicks_equal_satisfaction": CLICKS_EQUAL_SATISFACTION,
        "first_value_satisfied_by_path_readiness": FIRST_VALUE_SATISFIED_BY_PATH_READINESS,
        "eighth_primary_nav": EIGHTH_PRIMARY_NAV,
        "auto_continue_after_data_trust": AUTO_CONTINUE_AFTER_DATA_TRUST,
        "boundaries": {
            "guided_first_value_demo": OWNS_GFV_DEMO,
            "import": OWNS_IMPORT,
            "workspace_search": OWNS_SEARCH,
            "data_trust": OWNS_DATA_TRUST,
            "daily_os_execution_calendar": OWNS_DAILY_OS_EXEC_CAL,
        },
        "banned_copy_phrases": sorted(BANNED_COPY_PHRASES),
        "resolution_deep_links": sorted(RESOLUTION_DEEP_LINKS),
    }


def assert_copy_safe(text: str) -> bool:
    low = (text or "").lower()
    return not any(p in low for p in BANNED_COPY_PHRASES)


def _path_meta(path_kind: str) -> dict[str, Any]:
    """Product-blocker oriented labels — never 'ready to apply/interview'."""
    meta = {
        "EVALUATE_ONE_OPPORTUNITY": {
            "object_kind": "opportunity",
            "editor_route": "/dashboard/matches",
            "label_key": "evaluate_one_opportunity",
        },
        "PREPARE_ONE_APPLICATION": {
            "object_kind": "application_workspace",
            "editor_route": "/dashboard/application-studio",
            "label_key": "prepare_one_application",
        },
        "PREPARE_ONE_INTERVIEW": {
            "object_kind": "interview_process",
            "editor_route": "/dashboard/interview-decision",
            "label_key": "prepare_one_interview",
        },
        "REVIEW_ONE_CAREER_DECISION": {
            "object_kind": "decision",
            "editor_route": "/dashboard/approvals",
            "label_key": "review_one_career_decision",
        },
        "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION": {
            "object_kind": "decision",
            "editor_route": "/dashboard/execution-calendar",
            "label_key": "move_one_approved_decision_to_execution",
        },
    }
    return meta[path_kind]


def list_path_options(db: Session, *, candidate_id: int) -> dict[str, Any]:
    """Five paths with selectable objects — no ranking / best-path."""
    paused = _privacy_paused(db, candidate_id=candidate_id)
    paths = []
    for kind in PATH_KINDS:
        meta = _path_meta(kind)
        objects = _list_objects(db, candidate_id=candidate_id, path_kind=kind)
        # Healthy empty = STARTABLE (not false BLOCKED)
        path_state = "UNAVAILABLE" if paused else "STARTABLE"
        paths.append(
            {
                "path_kind": kind,
                "object_kind": meta["object_kind"],
                "editor_route": meta["editor_route"],
                "path_state": path_state,
                "selectable_object_count": len(objects),
                "objects": objects,
                "recommended": False,
                "score": None,
            }
        )
    return {
        "schema_id": SCHEMA_ID,
        "mutations": 0,
        "recommends_best_path": False,
        "paths": paths,
        "first_value_satisfied": False,
    }


def _list_objects(db: Session, *, candidate_id: int, path_kind: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if path_kind == "EVALUATE_ONE_OPPORTUNITY":
        rows = (
            db.query(CandidateNormalizedOpportunity)
            .filter(
                CandidateNormalizedOpportunity.candidate_id == candidate_id,
                CandidateNormalizedOpportunity.deleted_at.is_(None),
            )
            .order_by(CandidateNormalizedOpportunity.id.desc())
            .limit(20)
            .all()
        )
        for r in rows:
            title = (getattr(r, "title", None) or getattr(r, "role_title", None) or "opportunity")[
                :80
            ]
            out.append(
                {
                    "object_ref": str(r.id),
                    "object_kind": "opportunity",
                    "label": str(title),
                    "claim_kind": getattr(r, "claim_kind", "INFERENCE") or "INFERENCE",
                }
            )
    elif path_kind == "PREPARE_ONE_APPLICATION":
        rows = (
            db.query(CandidateAppStudioWorkspace)
            .filter(
                CandidateAppStudioWorkspace.candidate_id == candidate_id,
                CandidateAppStudioWorkspace.deleted_at.is_(None),
            )
            .order_by(CandidateAppStudioWorkspace.id.desc())
            .limit(20)
            .all()
        )
        for r in rows:
            out.append(
                {
                    "object_ref": str(r.id),
                    "object_kind": "application_workspace",
                    "label": (r.title or f"workspace:{r.id}")[:80],
                    "claim_kind": getattr(r, "claim_kind", "FACT") or "FACT",
                }
            )
    elif path_kind == "PREPARE_ONE_INTERVIEW":
        rows = (
            db.query(CandidateInterviewProcess)
            .filter(
                CandidateInterviewProcess.candidate_id == candidate_id,
                CandidateInterviewProcess.deleted_at.is_(None),
            )
            .order_by(CandidateInterviewProcess.id.desc())
            .limit(20)
            .all()
        )
        for r in rows:
            out.append(
                {
                    "object_ref": str(r.id),
                    "object_kind": "interview_process",
                    "label": (r.title or f"process:{r.id}")[:80],
                    "claim_kind": getattr(r, "claim_kind", "FACT") or "FACT",
                }
            )
    elif path_kind in {
        "REVIEW_ONE_CAREER_DECISION",
        "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION",
    }:
        q = db.query(CandidateDecisionRecord).filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
        )
        if path_kind == "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION":
            q = q.filter(CandidateDecisionRecord.status == "approved_executed")
        rows = q.order_by(CandidateDecisionRecord.id.desc()).limit(20).all()
        for r in rows:
            out.append(
                {
                    "object_ref": str(r.id),
                    "object_kind": "decision",
                    "label": r.decision_key[:80],
                    "claim_kind": r.claim_kind or "SUGGESTION",
                    "status": r.status,
                    "stale": bool(r.stale),
                }
            )
    return out


def _active_session(
    db: Session, *, candidate_id: int, session_key: str | None = None
) -> CandidatePathReadinessSession | None:
    q = db.query(CandidatePathReadinessSession).filter(
        CandidatePathReadinessSession.candidate_id == candidate_id,
        CandidatePathReadinessSession.deleted_at.is_(None),
        CandidatePathReadinessSession.status == "ACTIVE",
    )
    if session_key:
        q = q.filter(CandidatePathReadinessSession.session_key == session_key)
    return q.order_by(CandidatePathReadinessSession.id.desc()).first()


def select_path(
    db: Session,
    *,
    candidate_id: int,
    path_kind: str,
    object_ref: str | None = None,
) -> dict[str, Any]:
    if path_kind not in PATH_KINDS:
        raise ValueError("invalid_path_kind")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    meta = _path_meta(path_kind)
    # Clear prior active PATH READINESS sessions only (not other Continuity flows)
    for old in (
        db.query(CandidatePathReadinessSession)
        .filter(
            CandidatePathReadinessSession.candidate_id == candidate_id,
            CandidatePathReadinessSession.status == "ACTIVE",
            CandidatePathReadinessSession.deleted_at.is_(None),
            CandidatePathReadinessSession.flow_kind == "CANDIDATE_PATH_READINESS",
        )
        .all()
    ):
        old.status = "SUPERSEDED"
        old.updated_at = _utcnow()

    row = CandidatePathReadinessSession(
        candidate_id=candidate_id,
        session_key=_uuid("prs"),
        path_kind=path_kind,
        object_kind=meta["object_kind"] if object_ref else None,
        object_ref=(object_ref or None) and str(object_ref)[:64],
        flow_kind="CANDIDATE_PATH_READINESS",
        owner_ref=(object_ref or None) and str(object_ref)[:128],
        step_key="selected",
        revision=1,
        route_key="path_readiness_home",
        continuity_schema="twin.candidate_journey_session/v1",
        status="ACTIVE",
        readiness_json="{}",
        schema_version=SCHEMA_ID,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=FIRST_VALUE_SATISFIED_BY_PATH_READINESS,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return evaluate_session(db, candidate_id=candidate_id, session_key=row.session_key)


def clear_session(db: Session, *, candidate_id: int, session_key: str) -> dict[str, Any]:
    row = _active_session(db, candidate_id=candidate_id, session_key=session_key)
    if row is None:
        raise LookupError("session_not_found")
    row.status = "CLEARED"
    row.cleared_at = _utcnow()
    row.updated_at = _utcnow()
    db.commit()
    return {
        "cleared": True,
        "session_key": session_key,
        "mutations": 0,
        "first_value_satisfied": False,
    }


def _req(
    *,
    key: str,
    status: str,
    required: bool,
    explanation: str,
    source_module: str,
    deep_link: str,
) -> dict[str, Any]:
    if deep_link not in RESOLUTION_DEEP_LINKS and not deep_link.startswith(
        tuple(RESOLUTION_DEEP_LINKS)
    ):
        # Allow query-string variants of allowlisted prefixes
        base = deep_link.split("?")[0]
        if base not in RESOLUTION_DEEP_LINKS:
            raise ValueError(f"deep_link_not_allowlisted:{deep_link}")
    if not assert_copy_safe(explanation):
        raise ValueError("banned_copy_phrase")
    return {
        "requirement_key": key,
        "status": status,
        "required": required,
        "explanation": explanation,
        "source_module": source_module,
        "deep_link": deep_link,
        "mutates_on_click": False,
        "satisfies_first_value_on_click": False,
    }


def _derive_path_state(requirements: list[dict[str, Any]], *, has_object: bool, paused: bool) -> str:
    if paused:
        return "UNAVAILABLE"
    if not has_object:
        return "STARTABLE"
    blocking = [
        r
        for r in requirements
        if r.get("required") and r.get("status") in {"MISSING", "BLOCKING", "STALE"}
    ]
    if blocking:
        return "BLOCKED"
    required = [r for r in requirements if r.get("required")]
    if required and all(r.get("status") == "SATISFIED" for r in required):
        return "COMPLETE"
    return "IN_PROGRESS"


def evaluate_session(
    db: Session, *, candidate_id: int, session_key: str
) -> dict[str, Any]:
    """Two-axis readiness — never mutates domain editors."""
    row = (
        db.query(CandidatePathReadinessSession)
        .filter(
            CandidatePathReadinessSession.candidate_id == candidate_id,
            CandidatePathReadinessSession.session_key == session_key,
            CandidatePathReadinessSession.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("session_not_found")

    paused = _privacy_paused(db, candidate_id=candidate_id)
    path_kind = row.path_kind
    has_object = bool(row.object_ref)
    requirements = _build_requirements(
        db,
        candidate_id=candidate_id,
        path_kind=path_kind,
        object_ref=row.object_ref,
        has_object=has_object,
        paused=paused,
    )
    path_state = _derive_path_state(requirements, has_object=has_object, paused=paused)
    routes = [
        {
            "requirement_key": r["requirement_key"],
            "deep_link": r["deep_link"],
            "explanation": r["explanation"],
            "source_module": r["source_module"],
            "mutates_on_click": False,
            "data_trust_handoff": r["deep_link"].startswith("/dashboard/data-trust"),
            "auto_continue": False,
        }
        for r in requirements
        if r.get("required") and r.get("status") in {"MISSING", "BLOCKING", "STALE"}
    ]
    # Optional Data Trust open reviews → handoff only
    open_dt = (
        db.query(CandidateDataTrustReview)
        .filter(
            CandidateDataTrustReview.candidate_id == candidate_id,
            CandidateDataTrustReview.deleted_at.is_(None),
            CandidateDataTrustReview.status.in_(
                {"OPEN", "IN_REVIEW", "PREVIEWED", "PENDING_APPROVAL"}
            ),
        )
        .count()
    )
    if open_dt and path_kind in {
        "EVALUATE_ONE_OPPORTUNITY",
        "PREPARE_ONE_APPLICATION",
        "REVIEW_ONE_CAREER_DECISION",
    }:
        routes.append(
            {
                "requirement_key": "open_data_trust_review",
                "deep_link": "/dashboard/data-trust",
                "explanation": "Open data reconciliation review needs attention before continuing this path.",
                "source_module": OWNS_DATA_TRUST,
                "mutates_on_click": False,
                "data_trust_handoff": True,
                "auto_continue": False,
            }
        )

    payload = {
        "schema_id": SCHEMA_ID,
        "session_key": row.session_key,
        "path_kind": path_kind,
        "object_kind": row.object_kind,
        "object_ref": row.object_ref,
        "path_state": path_state,
        "requirements": requirements,
        "resolution_routes": routes,
        "mutations": 0,
        "external_actions": 0,
        "recommends_best_path": False,
        "person_employability_scores": False,
        "mutates_on_evaluate": False,
        "first_value_satisfied": False,
        "clicks_equal_satisfaction": False,
        "auto_continue_after_data_trust": False,
    }
    row.readiness_json = _dumps(
        {
            "path_state": path_state,
            "requirement_count": len(requirements),
            "route_count": len(routes),
        }
    )
    row.updated_at = _utcnow()
    row.first_value_satisfied = False
    db.commit()
    return payload


def _build_requirements(
    db: Session,
    *,
    candidate_id: int,
    path_kind: str,
    object_ref: str | None,
    has_object: bool,
    paused: bool,
) -> list[dict[str, Any]]:
    reqs: list[dict[str, Any]] = []
    if paused:
        reqs.append(
            _req(
                key="privacy_pause",
                status="BLOCKING",
                required=True,
                explanation="Privacy pause is on — resume in Settings before path work.",
                source_module="lifecycle_privacy",
                deep_link="/dashboard/privacy-center",
            )
        )
        return reqs

    # Object selection — missing object is STARTABLE, not BLOCKED
    if not has_object:
        reqs.append(
            _req(
                key="object_selection",
                status="OPTIONAL",
                required=False,
                explanation="Select one object to evaluate product blockers for this path.",
                source_module="path_readiness",
                deep_link=_path_meta(path_kind)["editor_route"],
            )
        )
        return reqs

    evidence_count = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.status != "archived",
        )
        .count()
    )

    if path_kind == "EVALUATE_ONE_OPPORTUNITY":
        opp = (
            db.query(CandidateNormalizedOpportunity)
            .filter(
                CandidateNormalizedOpportunity.candidate_id == candidate_id,
                CandidateNormalizedOpportunity.id == int(object_ref),
                CandidateNormalizedOpportunity.deleted_at.is_(None),
            )
            .one_or_none()
        )
        reqs.append(
            _req(
                key="opportunity_present",
                status="SATISFIED" if opp else "MISSING",
                required=True,
                explanation=(
                    "Selected opportunity is available in Opportunities."
                    if opp
                    else "Selected opportunity is missing — open Opportunities to pick another."
                ),
                source_module="opportunity_intelligence",
                deep_link="/dashboard/matches",
            )
        )
        reqs.append(
            _req(
                key="evidence_for_evaluation",
                status="SATISFIED" if evidence_count else "MISSING",
                required=True,
                explanation=(
                    "At least one evidence item is present for comparison."
                    if evidence_count
                    else "Add evidence in Portfolio before evaluating this opportunity."
                ),
                source_module="career_evidence",
                deep_link="/dashboard/portfolio",
            )
        )
    elif path_kind == "PREPARE_ONE_APPLICATION":
        ws = (
            db.query(CandidateAppStudioWorkspace)
            .filter(
                CandidateAppStudioWorkspace.candidate_id == candidate_id,
                CandidateAppStudioWorkspace.id == int(object_ref),
                CandidateAppStudioWorkspace.deleted_at.is_(None),
            )
            .one_or_none()
        )
        reqs.append(
            _req(
                key="application_workspace_present",
                status="SATISFIED" if ws else "MISSING",
                required=True,
                explanation=(
                    "Application workspace is present."
                    if ws
                    else "Application workspace missing — open Application Studio."
                ),
                source_module="application_studio",
                deep_link="/dashboard/application-studio",
            )
        )
        reqs.append(
            _req(
                key="evidence_for_application",
                status="SATISFIED" if evidence_count else "MISSING",
                required=True,
                explanation=(
                    "Evidence is available for application preparation."
                    if evidence_count
                    else "Add evidence in Portfolio before preparing an application package."
                ),
                source_module="career_evidence",
                deep_link="/dashboard/portfolio",
            )
        )
    elif path_kind == "PREPARE_ONE_INTERVIEW":
        proc = (
            db.query(CandidateInterviewProcess)
            .filter(
                CandidateInterviewProcess.candidate_id == candidate_id,
                CandidateInterviewProcess.id == int(object_ref),
                CandidateInterviewProcess.deleted_at.is_(None),
            )
            .one_or_none()
        )
        reqs.append(
            _req(
                key="interview_process_present",
                status="SATISFIED" if proc else "MISSING",
                required=True,
                explanation=(
                    "Interview process is present."
                    if proc
                    else "Interview process missing — open Interview Decision."
                ),
                source_module="interview_decision",
                deep_link=f"/dashboard/interview-decision?process={object_ref}"
                if proc
                else "/dashboard/interview-decision",
            )
        )
    elif path_kind == "REVIEW_ONE_CAREER_DECISION":
        dec = (
            db.query(CandidateDecisionRecord)
            .filter(
                CandidateDecisionRecord.candidate_id == candidate_id,
                CandidateDecisionRecord.id == int(object_ref),
                CandidateDecisionRecord.deleted_at.is_(None),
            )
            .one_or_none()
        )
        reqs.append(
            _req(
                key="decision_present",
                status="SATISFIED" if dec else "MISSING",
                required=True,
                explanation=(
                    "Decision record is present for review."
                    if dec
                    else "Decision missing — open Decisions / Approvals."
                ),
                source_module="strategy_review_governance",
                deep_link="/dashboard/approvals",
            )
        )
        if dec and dec.stale:
            reqs.append(
                _req(
                    key="decision_stale",
                    status="STALE",
                    required=True,
                    explanation="Decision is marked STALE — reconfirm or revise in Approvals.",
                    source_module="strategy_review_governance",
                    deep_link="/dashboard/approvals",
                )
            )
        elif dec:
            reqs.append(
                _req(
                    key="decision_fresh",
                    status="SATISFIED",
                    required=True,
                    explanation="Decision is not marked STALE.",
                    source_module="strategy_review_governance",
                    deep_link="/dashboard/approvals",
                )
            )
    elif path_kind == "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION":
        dec = (
            db.query(CandidateDecisionRecord)
            .filter(
                CandidateDecisionRecord.candidate_id == candidate_id,
                CandidateDecisionRecord.id == int(object_ref),
                CandidateDecisionRecord.deleted_at.is_(None),
            )
            .one_or_none()
        )
        approved = bool(dec and dec.status == "approved_executed")
        reqs.append(
            _req(
                key="decision_approved_executed",
                status="SATISFIED" if approved else "BLOCKING",
                required=True,
                explanation=(
                    "Decision is approved and executed — execution requirements may apply."
                    if approved
                    else "Decision is not approved-executed — resolve approval first."
                ),
                source_module="strategy_review_governance",
                deep_link="/dashboard/approvals",
            )
        )
        reqs_q = (
            db.query(CandidateExecutionRequirement)
            .filter(
                CandidateExecutionRequirement.candidate_id == candidate_id,
                CandidateExecutionRequirement.decision_id == int(object_ref),
                CandidateExecutionRequirement.deleted_at.is_(None),
            )
            .all()
        )
        open_reqs = [r for r in reqs_q if r.status == "open" and not r.stale]
        if approved and not reqs_q:
            reqs.append(
                _req(
                    key="execution_requirements",
                    status="MISSING",
                    required=True,
                    explanation="No execution requirements yet — open Execution Calendar to continue planning.",
                    source_module=OWNS_DAILY_OS_EXEC_CAL,
                    deep_link="/dashboard/execution-calendar",
                )
            )
        elif open_reqs:
            reqs.append(
                _req(
                    key="execution_requirements_open",
                    status="PRESENT",
                    required=True,
                    explanation="Open execution requirements exist — continue in Execution Calendar.",
                    source_module=OWNS_DAILY_OS_EXEC_CAL,
                    deep_link="/dashboard/execution-calendar",
                )
            )
            # PRESENT open work → treat as not fully SATISFIED for COMPLETE
            reqs[-1]["status"] = "BLOCKING"
        elif approved:
            reqs.append(
                _req(
                    key="execution_requirements_done",
                    status="SATISFIED",
                    required=True,
                    explanation="No open execution requirements remain for this decision.",
                    source_module=OWNS_DAILY_OS_EXEC_CAL,
                    deep_link="/dashboard/execution-calendar",
                )
            )

    # Candidate profile presence (optional axis signal — never employability score)
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one_or_none()
    has_name = bool(cand and (cand.name or "").strip())
    reqs.append(
        _req(
            key="profile_basics",
            status="SATISFIED" if has_name else "OPTIONAL",
            required=False,
            explanation="Profile basics are optional for this path.",
            source_module="candidate_profile",
            deep_link="/dashboard/career",
        )
    )
    return reqs


def recalculate_after_data_trust(
    db: Session, *, candidate_id: int, session_key: str
) -> dict[str, Any]:
    """Handoff return — recalculate only; never auto-continue the path."""
    out = evaluate_session(db, candidate_id=candidate_id, session_key=session_key)
    out["data_trust_handoff_return"] = True
    out["auto_continue"] = False
    return out


def current_session(db: Session, *, candidate_id: int) -> dict[str, Any]:
    row = _active_session(db, candidate_id=candidate_id)
    if row is None:
        return {
            "schema_id": SCHEMA_ID,
            "session": None,
            "path_state": "STARTABLE",
            "mutations": 0,
            "first_value_satisfied": False,
        }
    return evaluate_session(db, candidate_id=candidate_id, session_key=row.session_key)


def record_route_click(
    db: Session, *, candidate_id: int, session_key: str, deep_link: str
) -> dict[str, Any]:
    """Content-free telemetry — click never satisfies first value."""
    _ = db
    base = deep_link.split("?")[0]
    if base not in RESOLUTION_DEEP_LINKS:
        raise ValueError("deep_link_not_allowlisted")
    return {
        "recorded": True,
        "session_key": session_key,
        "deep_link": base,
        "satisfies_first_value": False,
        "mutations": 0,
        "kpi_excluded": True,
    }
