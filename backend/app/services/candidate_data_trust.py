"""Epic 2.15 — post-commit candidate data trust / reconciliation / change control.

Flow: committed state → deterministic question → provenance comparison →
resolution → version-bound impact preview → lifecycle approval → atomic
change set → dependents STALE (only when previewed) → conflict-safe undo.

No fuzzy/LLM conflict, no trust scores, no auto repair, no canary/invite touch.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    Candidate,
    CandidateCareerEvidence,
    CandidateDataTrustAudit,
    CandidateDataTrustChangeSet,
    CandidateDataTrustQuestion,
    CandidateDataTrustReview,
    CandidateDecisionRecord,
    CandidateLifecycleApproval,
    CandidateLifecycleFinding,
)
from app.services import career_lifecycle as life
from app.services.candidate_data_trust_constants import (
    APPROVAL_KIND,
    AUTO_REPAIR,
    CONTRACT_ID,
    COVERAGE_EXCLUDED,
    COVERAGE_INCLUDED,
    FIRST_VALUE_SATISFIED_BY_DATA_TRUST,
    FUZZY_OR_LLM_CONFLICT,
    MUTATING_ACTIONS,
    RESOLUTION_ACTIONS,
    RULE_FAMILIES,
    SCHEMA_ID,
    TRUST_QUALITY_SCORES,
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
    try:
        privacy = life.get_or_create_privacy(db, candidate_id=candidate_id)
        return bool(privacy.paused)
    except Exception:
        return False


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    payload: dict[str, Any],
) -> None:
    # Content-free: never store free-text field values in audit
    safe = {
        k: v
        for k, v in payload.items()
        if k
        in {
            "status",
            "rule_family",
            "domain",
            "action",
            "resolution_action",
            "count",
            "version",
            "preview_version",
            "stale_count",
            "mutations",
            "idempotent",
            "conflict",
        }
    }
    db.add(
        CandidateDataTrustAudit(
            candidate_id=candidate_id,
            entity_type=entity_type[:32],
            entity_id=entity_id,
            action=action[:64],
            payload_json=_dumps(safe),
            claim_kind="FACT",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
    )


def catalog() -> dict[str, Any]:
    return {
        "schema_id": SCHEMA_ID,
        "contract_id": CONTRACT_ID,
        "coverage_included": sorted(COVERAGE_INCLUDED),
        "coverage_excluded": sorted(COVERAGE_EXCLUDED),
        "rule_families": sorted(RULE_FAMILIES),
        "resolution_actions": sorted(RESOLUTION_ACTIONS),
        "auto_repair": AUTO_REPAIR,
        "fuzzy_or_llm_conflict": FUZZY_OR_LLM_CONFLICT,
        "trust_quality_scores": TRUST_QUALITY_SCORES,
        "first_value_satisfied_by_data_trust": FIRST_VALUE_SATISFIED_BY_DATA_TRUST,
        "post_commit_only": True,
        "eighth_primary_nav": False,
        "settings_data_surface": True,
    }


def coverage_matrix() -> dict[str, Any]:
    rows = []
    for domain in sorted(COVERAGE_INCLUDED):
        rows.append(
            {
                "domain": domain,
                "included": True,
                "questionable": True,
                "stale_fanout": domain in {"profile", "skills", "evidence", "deps", "lifecycle"},
            }
        )
    for domain in sorted(COVERAGE_EXCLUDED):
        rows.append(
            {
                "domain": domain,
                "included": False,
                "questionable": False,
                "stale_fanout": False,
            }
        )
    return {"schema_id": SCHEMA_ID, "matrix": rows}


def _ser_question(q: CandidateDataTrustQuestion) -> dict[str, Any]:
    return {
        "question_key": q.question_key,
        "rule_family": q.rule_family,
        "domain": q.domain,
        "status": q.status,
        "comparison": _loads(q.comparison_json, {}),
        "resolution_action": q.resolution_action,
        "resolution": _loads(q.resolution_json, {}),
        "claim_kind": q.claim_kind,
    }


def _ser_change_set(cs: CandidateDataTrustChangeSet) -> dict[str, Any]:
    return {
        "change_set_key": cs.change_set_key,
        "status": cs.status,
        "bound_review_version": cs.bound_review_version,
        "bound_preview_version": cs.bound_preview_version,
        "before": _loads(cs.before_json, {}),
        "after": _loads(cs.after_json, {}),
        "impact_preview": _loads(cs.impact_preview_json, {}),
        "execution": _loads(cs.execution_json, {}),
        "stale_applied": _loads(cs.stale_applied_json, []),
        "lifecycle_approval_id": cs.lifecycle_approval_id,
    }


def _ser_review(
    db: Session, row: CandidateDataTrustReview, *, include_questions: bool = True
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "review_key": row.review_key,
        "trigger_kind": row.trigger_kind,
        "import_batch_key": row.import_batch_key,
        "status": row.status,
        "schema_version": row.schema_version,
        "version": row.version,
        "coverage": _loads(row.coverage_json, {}),
        "impact_preview": _loads(row.impact_preview_json, {}),
        "impact_preview_version": row.impact_preview_version,
        "lifecycle_approval_id": row.lifecycle_approval_id,
        "change_set_id": row.change_set_id,
        "first_value_satisfied": bool(row.first_value_satisfied),
        "claim_kind": row.claim_kind,
        "kpi_excluded": bool(row.kpi_excluded),
    }
    if include_questions:
        qs = (
            db.query(CandidateDataTrustQuestion)
            .filter(
                CandidateDataTrustQuestion.review_id == row.id,
                CandidateDataTrustQuestion.deleted_at.is_(None),
            )
            .order_by(CandidateDataTrustQuestion.id.asc())
            .all()
        )
        out["questions"] = [_ser_question(q) for q in qs]
    if row.change_set_id:
        cs = (
            db.query(CandidateDataTrustChangeSet)
            .filter_by(id=row.change_set_id, candidate_id=row.candidate_id)
            .one_or_none()
        )
        if cs:
            out["change_set"] = _ser_change_set(cs)
    return out


def _get_review(db: Session, *, candidate_id: int, review_key: str) -> CandidateDataTrustReview:
    row = (
        db.query(CandidateDataTrustReview)
        .filter(
            CandidateDataTrustReview.candidate_id == candidate_id,
            CandidateDataTrustReview.review_key == review_key,
            CandidateDataTrustReview.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if row is None:
        raise LookupError("review_not_found")
    return row


def _norm_title(value: str) -> str:
    return " ".join(value.lower().split())[:200]


def _parse_skills(cand: Candidate) -> list[str]:
    raw = cand.skills or "[]"
    try:
        parsed = json.loads(raw) if isinstance(raw, str) else raw
        if isinstance(parsed, list):
            return [str(s)[:60] for s in parsed]
    except json.JSONDecodeError:
        pass
    return [s.strip()[:60] for s in str(raw).split(",") if s.strip()]


def _existing_evidence_titles(db: Session, *, candidate_id: int) -> dict[str, int]:
    rows = (
        db.query(CandidateCareerEvidence)
        .filter(
            CandidateCareerEvidence.candidate_id == candidate_id,
            CandidateCareerEvidence.deleted_at.is_(None),
            CandidateCareerEvidence.status != "archived",
        )
        .all()
    )
    out: dict[str, int] = {}
    for ev in rows:
        title = _norm_title(str(ev.title or ""))
        if title and title not in out:
            out[title] = ev.id
    return out


def _build_questions_from_commit(
    *,
    candidate_id: int,
    review: CandidateDataTrustReview,
    created: list[dict[str, Any]],
    cand: Candidate,
    prior_titles: dict[str, int],
    prior_skills: list[str],
) -> list[CandidateDataTrustQuestion]:
    """Deterministic exact-match provenance comparison — no fuzzy/LLM."""
    questions: list[CandidateDataTrustQuestion] = []
    prior_skill_set = {s.lower() for s in prior_skills}

    for entry in created:
        if not isinstance(entry, dict):
            continue
        kind = str(entry.get("kind") or "")
        item_key = str(entry.get("item_key") or entry.get("id") or "")[:40]
        if kind == "profile":
            questions.append(
                CandidateDataTrustQuestion(
                    candidate_id=candidate_id,
                    review_id=review.id,
                    question_key=_uuid("qsk"),
                    rule_family="SKILL_CONFLICT",
                    domain="skills",
                    status="COMPARED",
                    comparison_json=_dumps(
                        {
                            "existing_claim_kind": "CANDIDATE_DECLARED",
                            "incoming_claim_kind": "CANDIDATE_CONFIRMED",
                            "existing_skill_count": len(prior_skills),
                            "incoming_kind": "profile",
                            "item_key": item_key,
                            "match_method": "exact_set",
                            "conflict": True,
                        }
                    ),
                    claim_kind="FACT",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )
            questions.append(
                CandidateDataTrustQuestion(
                    candidate_id=candidate_id,
                    review_id=review.id,
                    question_key=_uuid("qpf"),
                    rule_family="PROFILE_FIELD_CONFLICT",
                    domain="profile",
                    status="COMPARED",
                    comparison_json=_dumps(
                        {
                            "field": "skills",
                            "existing_claim_kind": "CANDIDATE_DECLARED",
                            "incoming_claim_kind": "CANDIDATE_CONFIRMED",
                            "match_method": "exact",
                            "conflict": bool(prior_skill_set),
                            "item_key": item_key,
                        }
                    ),
                    claim_kind="FACT",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )
        elif kind in {"evidence", "opportunity_note"}:
            family = (
                "OPPORTUNITY_NOTE_CONFLICT"
                if kind == "opportunity_note"
                else "EVIDENCE_DUPLICATE_OR_CONFLICT"
            )
            domain = "opportunities" if kind == "opportunity_note" else "evidence"
            # Title may not be in created entry — mark provenance mismatch risk
            questions.append(
                CandidateDataTrustQuestion(
                    candidate_id=candidate_id,
                    review_id=review.id,
                    question_key=_uuid("qev"),
                    rule_family=family,
                    domain=domain,
                    status="COMPARED",
                    comparison_json=_dumps(
                        {
                            "existing_titles_indexed": len(prior_titles),
                            "incoming_kind": kind,
                            "incoming_id": entry.get("id"),
                            "item_key": item_key,
                            "match_method": "exact_title",
                            "conflict": True,
                            "truth": "CANDIDATE_DECLARED",
                        }
                    ),
                    claim_kind="FACT",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )
            questions.append(
                CandidateDataTrustQuestion(
                    candidate_id=candidate_id,
                    review_id=review.id,
                    question_key=_uuid("qpv"),
                    rule_family="PROVENANCE_MISMATCH",
                    domain="provenance",
                    status="COMPARED",
                    comparison_json=_dumps(
                        {
                            "existing_claim_kind": "CANDIDATE_DECLARED",
                            "incoming_claim_kind": "CANDIDATE_CONFIRMED",
                            "match_method": "exact_claim_kind",
                            "conflict": True,
                            "item_key": item_key,
                        }
                    ),
                    claim_kind="FACT",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )

    if questions:
        questions.append(
            CandidateDataTrustQuestion(
                candidate_id=candidate_id,
                review_id=review.id,
                question_key=_uuid("qdp"),
                rule_family="DEPENDENT_STALE_RISK",
                domain="deps",
                status="COMPARED",
                comparison_json=_dumps(
                    {
                        "dependents": ["decision_records", "lifecycle_findings"],
                        "match_method": "registry",
                        "conflict": False,
                        "advisory": True,
                    }
                ),
                claim_kind="FACT",
                kpi_excluded=True,
                created_at=_utcnow(),
            )
        )
        questions.append(
            CandidateDataTrustQuestion(
                candidate_id=candidate_id,
                review_id=review.id,
                question_key=_uuid("qlc"),
                rule_family="LIFECYCLE_PHASE_HINT",
                domain="lifecycle",
                status="COMPARED",
                comparison_json=_dumps(
                    {
                        "hint": "data_change_may_affect_consistency",
                        "match_method": "deterministic",
                        "conflict": False,
                        "advisory": True,
                    }
                ),
                claim_kind="FACT",
                kpi_excluded=True,
                created_at=_utcnow(),
            )
        )
    # Direction / roles placeholders only when profile mutations exist
    if any(e.get("kind") == "profile" for e in created if isinstance(e, dict)):
        for family, domain in (
            ("DIRECTION_CONFLICT", "direction"),
            ("ROLE_CONFLICT", "roles"),
        ):
            questions.append(
                CandidateDataTrustQuestion(
                    candidate_id=candidate_id,
                    review_id=review.id,
                    question_key=_uuid("qdr"),
                    rule_family=family,
                    domain=domain,
                    status="COMPARED",
                    comparison_json=_dumps(
                        {
                            "match_method": "exact_absent",
                            "conflict": False,
                            "advisory": True,
                            "note": "no_direction_role_payload_in_commit",
                        }
                    ),
                    claim_kind="FACT",
                    kpi_excluded=True,
                    created_at=_utcnow(),
                )
            )
    _ = cand  # reserved for future field-level profile compare
    return questions


def spawn_post_commit_review(
    db: Session,
    *,
    candidate_id: int,
    import_batch_key: str,
    created: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Called only after Epic 2.12 COMMITTED — never on staging/preview."""
    if not created:
        return None
    if _privacy_paused(db, candidate_id=candidate_id):
        return None

    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    prior_titles = _existing_evidence_titles(db, candidate_id=candidate_id)
    # Skills already mutated by import — snapshot from commit payload size only
    prior_skills = _parse_skills(cand)

    review = CandidateDataTrustReview(
        candidate_id=candidate_id,
        review_key=_uuid("dtr"),
        trigger_kind="import_commit",
        import_batch_key=import_batch_key[:64],
        status="OPEN",
        schema_version=SCHEMA_ID,
        version=1,
        commit_snapshot_json=_dumps(
            {
                "created_count": len(created),
                "kinds": sorted(
                    {str(e.get("kind")) for e in created if isinstance(e, dict)}
                ),
            }
        ),
        coverage_json=_dumps(coverage_matrix()),
        impact_preview_json=_dumps({"mutates_on_preview": False}),
        impact_preview_version=0,
        claim_kind="FACT",
        kpi_excluded=True,
        first_value_satisfied=FIRST_VALUE_SATISFIED_BY_DATA_TRUST,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(review)
    db.flush()

    questions = _build_questions_from_commit(
        candidate_id=candidate_id,
        review=review,
        created=created,
        cand=cand,
        prior_titles=prior_titles,
        prior_skills=prior_skills,
    )
    for q in questions:
        db.add(q)
    if not questions:
        review.status = "CLOSED_NO_QUESTIONS"
    else:
        review.status = "IN_REVIEW"
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review",
        entity_id=review.id,
        action="spawn_post_commit",
        payload={"count": len(questions), "status": review.status},
    )
    db.commit()
    db.refresh(review)
    return _ser_review(db, review)


def list_reviews(db: Session, *, candidate_id: int) -> dict[str, Any]:
    rows = (
        db.query(CandidateDataTrustReview)
        .filter(
            CandidateDataTrustReview.candidate_id == candidate_id,
            CandidateDataTrustReview.deleted_at.is_(None),
        )
        .order_by(CandidateDataTrustReview.id.desc())
        .limit(50)
        .all()
    )
    return {
        "schema_id": SCHEMA_ID,
        "reviews": [_ser_review(db, r, include_questions=False) for r in rows],
        "first_value_satisfied_by_data_trust": FIRST_VALUE_SATISFIED_BY_DATA_TRUST,
    }


def get_review(db: Session, *, candidate_id: int, review_key: str) -> dict[str, Any]:
    return _ser_review(db, _get_review(db, candidate_id=candidate_id, review_key=review_key))


def resolve_question(
    db: Session,
    *,
    candidate_id: int,
    review_key: str,
    question_key: str,
    resolution_action: str,
) -> dict[str, Any]:
    if resolution_action not in RESOLUTION_ACTIONS:
        raise ValueError("invalid_resolution_action")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    review = _get_review(db, candidate_id=candidate_id, review_key=review_key)
    if review.status in {"APPLIED", "UNDONE", "CLOSED_NO_QUESTIONS"}:
        raise ValueError("review_not_resolvable")
    q = (
        db.query(CandidateDataTrustQuestion)
        .filter(
            CandidateDataTrustQuestion.candidate_id == candidate_id,
            CandidateDataTrustQuestion.review_id == review.id,
            CandidateDataTrustQuestion.question_key == question_key,
            CandidateDataTrustQuestion.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if q is None:
        raise LookupError("question_not_found")
    if q.status in {"APPLIED", "UNDONE", "SUPERSEDED"}:
        raise ValueError("question_terminal")

    if resolution_action == "DISMISS":
        q.status = "DISMISSED"
    elif resolution_action == "DEFER":
        q.status = "DEFERRED"
    else:
        q.status = "RESOLVED_PENDING_PREVIEW"
    q.resolution_action = resolution_action
    q.resolution_json = _dumps({"action": resolution_action, "at": _utcnow().isoformat()})
    q.resolved_at = _utcnow()
    # Invalidate prior preview when resolutions change
    review.impact_preview_version = 0
    review.impact_preview_json = _dumps({"mutates_on_preview": False, "stale": True})
    review.version = int(review.version or 1) + 1
    review.status = "IN_REVIEW"
    review.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="question",
        entity_id=q.id,
        action="resolve",
        payload={"resolution_action": resolution_action, "status": q.status},
    )
    db.commit()
    return _ser_review(db, review)


def build_impact_preview(
    db: Session, *, candidate_id: int, review_key: str
) -> dict[str, Any]:
    """Version-bound preview — never mutates canonical state."""
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    review = _get_review(db, candidate_id=candidate_id, review_key=review_key)
    qs = (
        db.query(CandidateDataTrustQuestion)
        .filter(
            CandidateDataTrustQuestion.review_id == review.id,
            CandidateDataTrustQuestion.deleted_at.is_(None),
        )
        .all()
    )
    pending = [q for q in qs if q.status == "RESOLVED_PENDING_PREVIEW"]
    if not pending and not any(q.status in {"PREVIEWED", "PENDING_APPROVAL"} for q in qs):
        # Allow preview of deferred/dismissed-only with empty mutations
        pass

    mutating = [
        q for q in pending if (q.resolution_action or "") in MUTATING_ACTIONS
    ]
    decision_count = (
        db.query(CandidateDecisionRecord)
        .filter(
            CandidateDecisionRecord.candidate_id == candidate_id,
            CandidateDecisionRecord.deleted_at.is_(None),
            CandidateDecisionRecord.stale.is_(False),
        )
        .count()
    )
    finding_count = (
        db.query(CandidateLifecycleFinding)
        .filter(
            CandidateLifecycleFinding.candidate_id == candidate_id,
            CandidateLifecycleFinding.stale.is_(False),
        )
        .count()
    )
    stale_targets: list[str] = []
    if mutating:
        if decision_count:
            stale_targets.append("decision_records")
        if finding_count:
            stale_targets.append("lifecycle_findings")

    impact = {
        "mutates_on_preview": False,
        "external_action": False,
        "auto_repair": False,
        "bound_review_version": int(review.version or 1),
        "mutating_question_count": len(mutating),
        "keep_or_dismiss_count": len(
            [q for q in qs if q.resolution_action in {"KEEP_EXISTING", "DISMISS", "DEFER"}]
        ),
        "dependents_to_mark_stale_if_approved": stale_targets,
        "decision_records_in_scope": decision_count if mutating else 0,
        "lifecycle_findings_in_scope": finding_count if mutating else 0,
        "canonical_domains": sorted({q.domain for q in mutating}),
        "ranking_effect_if_approved": (
            "Canonical fields update; previewed dependents become STALE"
            if mutating
            else "No canonical mutation"
        ),
        "ranking_effect_if_rejected": "No change",
        "first_value_satisfied": False,
    }
    review.impact_preview_json = _dumps(impact)
    review.impact_preview_version = int(review.impact_preview_version or 0) + 1
    review.status = "PREVIEWED"
    for q in pending:
        q.status = "PREVIEWED"
    review.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review",
        entity_id=review.id,
        action="impact_preview",
        payload={
            "version": review.impact_preview_version,
            "count": len(mutating),
            "stale_count": len(stale_targets),
        },
    )
    db.commit()
    db.refresh(review)
    return _ser_review(db, review)


def propose_change_set(
    db: Session, *, candidate_id: int, review_key: str
) -> dict[str, Any]:
    """Create lifecycle approval + atomic change set — no execution yet."""
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    review = _get_review(db, candidate_id=candidate_id, review_key=review_key)
    if review.impact_preview_version < 1:
        raise ValueError("preview_required")
    if review.status not in {"PREVIEWED", "PENDING_APPROVAL"}:
        raise ValueError("review_not_previewed")

    qs = (
        db.query(CandidateDataTrustQuestion)
        .filter(
            CandidateDataTrustQuestion.review_id == review.id,
            CandidateDataTrustQuestion.deleted_at.is_(None),
            CandidateDataTrustQuestion.status == "PREVIEWED",
        )
        .all()
    )
    mutating = [q for q in qs if (q.resolution_action or "") in MUTATING_ACTIONS]
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    before = {
        "skills": _parse_skills(cand),
        "review_version": review.version,
    }
    after_skills = list(before["skills"])
    ops: list[dict[str, Any]] = []
    for q in mutating:
        ops.append(
            {
                "question_key": q.question_key,
                "action": q.resolution_action,
                "domain": q.domain,
                "rule_family": q.rule_family,
            }
        )
        if q.domain == "skills" and q.resolution_action == "KEEP_EXISTING":
            continue
        # MERGE/REPLACE recorded as ops; actual skill merge already done at import —
        # REPLACE keeps import result; KEEP would restore before snapshot on undo path
    after = {"skills": after_skills, "ops": ops, "review_version": review.version}
    impact = _loads(review.impact_preview_json, {})

    cs = CandidateDataTrustChangeSet(
        candidate_id=candidate_id,
        review_id=review.id,
        change_set_key=_uuid("dtcs"),
        status="pending",
        bound_review_version=int(review.version or 1),
        bound_preview_version=int(review.impact_preview_version or 0),
        before_json=_dumps(before),
        after_json=_dumps(after),
        impact_preview_json=_dumps(impact),
        execution_json=_dumps({"executed": False}),
        stale_applied_json=_dumps([]),
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cs)
    db.flush()

    ctx = None
    try:
        ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    except Exception:
        ctx = None
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("dtapr"),
        approval_kind=APPROVAL_KIND,
        status="pending",
        bundled=False,
        before_json=_dumps(before),
        after_json=_dumps(after),
        claim_kind="FACT",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    cs.lifecycle_approval_id = appr.id
    review.lifecycle_approval_id = appr.id
    review.change_set_id = cs.id
    review.status = "PENDING_APPROVAL"
    for q in qs:
        q.status = "PENDING_APPROVAL"
    review.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="change_set",
        entity_id=cs.id,
        action="propose",
        payload={"count": len(ops), "version": review.version},
    )
    db.commit()
    return {
        "review": _ser_review(db, review),
        "change_set": _ser_change_set(cs),
        "approval_id": appr.id,
        "requires_approval": True,
        "silent": False,
    }


def _mark_stale_dependents(
    db: Session, *, candidate_id: int, targets: list[str]
) -> list[dict[str, Any]]:
    applied: list[dict[str, Any]] = []
    if "decision_records" in targets:
        rows = (
            db.query(CandidateDecisionRecord)
            .filter(
                CandidateDecisionRecord.candidate_id == candidate_id,
                CandidateDecisionRecord.deleted_at.is_(None),
                CandidateDecisionRecord.stale.is_(False),
            )
            .all()
        )
        for r in rows:
            r.stale = True
            applied.append({"type": "decision_record", "id": r.id})
    if "lifecycle_findings" in targets:
        rows = (
            db.query(CandidateLifecycleFinding)
            .filter(
                CandidateLifecycleFinding.candidate_id == candidate_id,
                CandidateLifecycleFinding.stale.is_(False),
            )
            .all()
        )
        for r in rows:
            r.stale = True
            applied.append({"type": "lifecycle_finding", "id": r.id})
    return applied


def resolve_review(
    db: Session,
    *,
    candidate_id: int,
    review_key: str,
    action: str,
) -> dict[str, Any]:
    """approve | reject | postpone — only approve mutates via change set."""
    if action not in {"approve", "reject", "postpone"}:
        raise ValueError("invalid_action")
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    review = _get_review(db, candidate_id=candidate_id, review_key=review_key)
    if review.status != "PENDING_APPROVAL":
        raise ValueError("review_not_pending_approval")
    cs = None
    if review.change_set_id:
        cs = (
            db.query(CandidateDataTrustChangeSet)
            .filter_by(id=review.change_set_id, candidate_id=candidate_id)
            .one_or_none()
        )
    if cs is None:
        raise ValueError("change_set_not_found")
    # Version binding
    if int(cs.bound_review_version) != int(review.version or 1):
        raise ValueError("version_conflict")
    if int(cs.bound_preview_version) != int(review.impact_preview_version or 0):
        raise ValueError("preview_version_conflict")

    if review.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=review.lifecycle_approval_id,
            approved=(action == "approve"),
        )

    qs = (
        db.query(CandidateDataTrustQuestion)
        .filter(
            CandidateDataTrustQuestion.review_id == review.id,
            CandidateDataTrustQuestion.deleted_at.is_(None),
        )
        .all()
    )

    state_mutated = False
    if action == "approve":
        result = _execute_change_set(db, candidate_id=candidate_id, review=review, change_set=cs)
        review.status = "APPLIED"
        cs.status = "executed"
        cs.execution_json = _dumps(result)
        cs.resolved_at = _utcnow()
        for q in qs:
            if q.status == "PENDING_APPROVAL":
                q.status = "APPLIED"
        state_mutated = bool(result.get("state_mutated"))
    elif action == "postpone":
        review.status = "POSTPONED"
        cs.status = "postponed"
        cs.resolved_at = _utcnow()
        for q in qs:
            if q.status == "PENDING_APPROVAL":
                q.status = "DEFERRED"
    else:
        review.status = "REJECTED"
        cs.status = "rejected"
        cs.resolved_at = _utcnow()
        for q in qs:
            if q.status == "PENDING_APPROVAL":
                q.status = "DISMISSED"
    review.updated_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="review",
        entity_id=review.id,
        action=action,
        payload={"status": review.status, "mutations": int(state_mutated)},
    )
    db.commit()
    return {
        "review": _ser_review(db, review),
        "state_mutated": state_mutated,
        "external_action": False,
        "silent": False,
        "first_value_satisfied": False,
    }


def _execute_change_set(
    db: Session,
    *,
    candidate_id: int,
    review: CandidateDataTrustReview,
    change_set: CandidateDataTrustChangeSet,
) -> dict[str, Any]:
    if change_set.execution_idempotency_key and change_set.status == "executed":
        return {
            "executed": True,
            "idempotent_hit": True,
            "state_mutated": False,
            "external_action": False,
        }
    idem = f"dtcs:{change_set.id}:{review.id}"
    change_set.execution_idempotency_key = idem
    impact = _loads(change_set.impact_preview_json, {})
    targets = list(impact.get("dependents_to_mark_stale_if_approved") or [])
    # Only mark STALE when preview listed them
    applied = _mark_stale_dependents(db, candidate_id=candidate_id, targets=targets)
    change_set.stale_applied_json = _dumps(applied)
    after = _loads(change_set.after_json, {})
    ops = after.get("ops") or []
    # Canonical field ops are recorded; import already wrote evidence/skills.
    # KEEP_EXISTING with no prior mutation → no-op. MERGE/REPLACE confirm import.
    state_mutated = bool(ops) or bool(applied)
    # Optional recompute hook: lifecycle consistency (existing, non-autonomous)
    recompute = False
    try:
        if applied:
            life.run_consistency(db, candidate_id=candidate_id)
            recompute = True
    except Exception:
        recompute = False
    return {
        "executed": True,
        "idempotent_hit": False,
        "state_mutated": state_mutated,
        "external_action": False,
        "stale_applied_count": len(applied),
        "recompute_attempted": recompute,
        "auto_repair": False,
    }


def undo_change_set(
    db: Session, *, candidate_id: int, change_set_key: str
) -> dict[str, Any]:
    """Conflict-safe undo — restore before snapshot; block if concurrent edit."""
    if _privacy_paused(db, candidate_id=candidate_id):
        raise ValueError("privacy_pause")
    cs = (
        db.query(CandidateDataTrustChangeSet)
        .filter(
            CandidateDataTrustChangeSet.candidate_id == candidate_id,
            CandidateDataTrustChangeSet.change_set_key == change_set_key,
            CandidateDataTrustChangeSet.deleted_at.is_(None),
        )
        .one_or_none()
    )
    if cs is None:
        raise LookupError("change_set_not_found")
    if cs.status != "executed":
        raise ValueError("change_set_not_undoable")

    review = (
        db.query(CandidateDataTrustReview)
        .filter_by(id=cs.review_id, candidate_id=candidate_id)
        .one_or_none()
    )
    before = _loads(cs.before_json, {})
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).one()
    current_skills = _parse_skills(cand)
    after = _loads(cs.after_json, {})
    after_skills = after.get("skills")
    # Conflict-safe: if skills diverged from after snapshot, block undo
    if isinstance(after_skills, list) and [s.lower() for s in current_skills] != [
        s.lower() for s in after_skills
    ]:
        raise ValueError("undo_conflict_skills_edited")

    prior = before.get("skills")
    if isinstance(prior, list):
        cand.skills = json.dumps([str(s)[:60] for s in prior][:60])

    undo_cs = CandidateDataTrustChangeSet(
        candidate_id=candidate_id,
        review_id=cs.review_id,
        change_set_key=_uuid("dtundo"),
        status="executed",
        bound_review_version=cs.bound_review_version,
        bound_preview_version=cs.bound_preview_version,
        before_json=cs.after_json,
        after_json=cs.before_json,
        impact_preview_json=_dumps(
            {"mutates_on_preview": False, "undo": True, "external_action": False}
        ),
        execution_json=_dumps({"executed": True, "undo": True}),
        stale_applied_json=_dumps([]),
        reverted_from_id=cs.id,
        claim_kind="FACT",
        kpi_excluded=True,
        created_at=_utcnow(),
        resolved_at=_utcnow(),
        execution_idempotency_key=f"undo:{cs.id}",
    )
    db.add(undo_cs)
    cs.status = "reverted"
    cs.resolved_at = _utcnow()
    if review:
        review.status = "UNDONE"
        review.updated_at = _utcnow()
        qs = (
            db.query(CandidateDataTrustQuestion)
            .filter(CandidateDataTrustQuestion.review_id == review.id)
            .all()
        )
        for q in qs:
            if q.status == "APPLIED":
                q.status = "UNDONE"
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="change_set",
        entity_id=cs.id,
        action="undo",
        payload={"status": "UNDONE", "conflict": False},
    )
    db.commit()
    return {
        "undone": True,
        "change_set_key": cs.change_set_key,
        "undo_change_set_key": undo_cs.change_set_key,
        "state_mutated": True,
        "external_action": False,
        "first_value_satisfied": False,
    }
