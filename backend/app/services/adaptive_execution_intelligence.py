"""Epic 2.7 Adaptive Execution Intelligence — candidate-controlled estimation + capacity learning.

Never: infer productivity/motivation/mental-health; silent estimate/capacity/strategy changes;
rewrite historic approved batches; treat calendar completion as employment success.
Actual effort is candidate-declared only.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import (
    CandidateAdaptiveExecutionAudit,
    CandidateCapacityCalibration,
    CandidateCapacityProfile,
    CandidateCommitmentBatch,
    CandidateCommitmentBatchItem,
    CandidateCommitmentQualityAnalysis,
    CandidateEstimateCalibration,
    CandidateEstimateComparison,
    CandidateEstimateSnapshot,
    CandidateEstimationProfile,
    CandidateExecutionObservation,
    CandidateExecutionPolicy,
    CandidateExecutionSimulation,
    CandidateLifecycleApproval,
)
from app.services import career_lifecycle as life
from app.services import decision_calendar_capacity as dcc

logger = logging.getLogger(__name__)

CANONICAL_DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"
SCHEMA = "twin.adaptive_execution_intelligence/v1"
ALEMBIC = "123_adaptive_execution_intelligence"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _uuid(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4().hex[:16]}"


def _dumps(obj: Any) -> str:
    return json.dumps(obj, default=str, separators=(",", ":"))


def _loads(raw: str | None, default: Any) -> Any:
    if not raw:
        return default
    try:
        return json.loads(raw)
    except Exception:
        return default


def _audit(
    db: Session,
    *,
    candidate_id: int,
    entity_type: str,
    entity_id: int | None,
    action: str,
    before: dict,
    after: dict,
) -> None:
    db.add(
        CandidateAdaptiveExecutionAudit(
            candidate_id=candidate_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before_json=_dumps(before),
            after_json=_dumps(after),
            created_at=_utcnow(),
        )
    )


def _privacy_ok(db: Session, *, candidate_id: int) -> bool:
    try:
        priv = life.get_or_create_privacy(db, candidate_id=candidate_id)
        return not bool(getattr(priv, "paused", False))
    except Exception:
        return True


def record_observation(
    db: Session,
    *,
    candidate_id: int,
    kind: str,
    batch_id: int | None = None,
    item_id: int | None = None,
    body: dict | None = None,
    claim_kind: str = "CANDIDATE_DECLARED",
) -> dict:
    """Append-only observation — refs only; no productivity scoring."""
    safe = dict(body or {})
    safe.pop("productivity_score", None)
    safe.pop("motivation", None)
    safe.pop("mental_health", None)
    safe["inferred_completion"] = False
    safe["productivity_score"] = None
    row = CandidateExecutionObservation(
        candidate_id=candidate_id,
        observation_key=_uuid("obs"),
        kind=kind[:64],
        batch_id=batch_id,
        item_id=item_id,
        body_json=_dumps(safe),
        claim_kind=claim_kind[:32],
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.flush()
    return _ser_obs(row)


def snapshot_estimates_for_batch(db: Session, *, candidate_id: int, batch_id: int) -> list[dict]:
    items = (
        db.query(CandidateCommitmentBatchItem)
        .filter(
            CandidateCommitmentBatchItem.candidate_id == candidate_id,
            CandidateCommitmentBatchItem.batch_id == batch_id,
            CandidateCommitmentBatchItem.deleted_at.is_(None),
        )
        .all()
    )
    out = []
    for it in items:
        snap = CandidateEstimateSnapshot(
            candidate_id=candidate_id,
            snapshot_key=_uuid(f"est:{it.id}"),
            batch_id=batch_id,
            item_id=it.id,
            estimated_minutes=int(it.effort_minutes or 60),
            source="batch_item",
            body_json=_dumps({"immutable_historic": True, "title_ref": it.item_key}),
            claim_kind="SUGGESTION",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
        db.add(snap)
        db.flush()
        out.append(_ser_snap(snap))
    db.commit()
    return out


def compare_estimate_vs_actual(
    db: Session, *, candidate_id: int, item_id: int, actual_minutes: int
) -> dict:
    """Compare planned vs candidate-declared actual — never infer actual."""
    item = (
        db.query(CandidateCommitmentBatchItem)
        .filter_by(id=item_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not item or item.deleted_at:
        raise ValueError("item_not_found")
    est = int(item.effort_minutes or 60)
    act = int(actual_minutes)
    delta = act - est
    ratio = (act / est) if est > 0 else None
    snap = (
        db.query(CandidateEstimateSnapshot)
        .filter(
            CandidateEstimateSnapshot.candidate_id == candidate_id,
            CandidateEstimateSnapshot.item_id == item_id,
            CandidateEstimateSnapshot.deleted_at.is_(None),
        )
        .order_by(CandidateEstimateSnapshot.id.desc())
        .first()
    )
    if snap is None:
        snap_row = CandidateEstimateSnapshot(
            candidate_id=candidate_id,
            snapshot_key=_uuid(f"est:{item_id}"),
            batch_id=item.batch_id,
            item_id=item_id,
            estimated_minutes=est,
            source="progress_backfill",
            body_json="{}",
            claim_kind="SUGGESTION",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
        db.add(snap_row)
        db.flush()
        snap = snap_row
    row = CandidateEstimateComparison(
        candidate_id=candidate_id,
        comparison_key=_uuid("cmp"),
        snapshot_id=snap.id,
        item_id=item_id,
        estimated_minutes=est,
        actual_minutes=act,
        delta_minutes=delta,
        ratio_json=_dumps(
            {
                "ratio": ratio,
                "claim_kind": "OBSERVED_INTERNAL_STATE",
                "inferred_actual": False,
                "productivity_score": None,
                "employment_success": False,
            }
        ),
        claim_kind="OBSERVED_INTERNAL_STATE",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    record_observation(
        db,
        candidate_id=candidate_id,
        kind="estimate_vs_actual",
        batch_id=item.batch_id,
        item_id=item_id,
        body={"estimated_minutes": est, "actual_minutes": act, "delta_minutes": delta},
        claim_kind="CANDIDATE_DECLARED",
    )
    db.commit()
    db.refresh(row)
    return _ser_cmp(row)


def get_or_create_estimation_profile(db: Session, *, candidate_id: int) -> CandidateEstimationProfile:
    row = (
        db.query(CandidateEstimationProfile)
        .filter(
            CandidateEstimationProfile.candidate_id == candidate_id,
            CandidateEstimationProfile.deleted_at.is_(None),
            CandidateEstimationProfile.status == "active",
        )
        .order_by(CandidateEstimationProfile.id.desc())
        .first()
    )
    if row:
        return row
    row = CandidateEstimationProfile(
        candidate_id=candidate_id,
        profile_key="default",
        version=1,
        status="active",
        factors_json=_dumps(
            {
                "effort_multiplier": 1.0,
                "sample_count": 0,
                "silent_apply": False,
                "productivity_score": None,
            }
        ),
        sample_count=0,
        claim_kind="INFERENCE",
        kpi_excluded=True,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def propose_estimate_calibration(db: Session, *, candidate_id: int) -> dict:
    """Build SUGGESTION from declared actuals — never auto-apply."""
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused")
    profile = get_or_create_estimation_profile(db, candidate_id=candidate_id)
    comps = (
        db.query(CandidateEstimateComparison)
        .filter(
            CandidateEstimateComparison.candidate_id == candidate_id,
            CandidateEstimateComparison.deleted_at.is_(None),
            CandidateEstimateComparison.actual_minutes.isnot(None),
        )
        .order_by(CandidateEstimateComparison.id.desc())
        .limit(50)
        .all()
    )
    if not comps:
        raise ValueError("insufficient_data")
    ratios = []
    for c in comps:
        if c.estimated_minutes and c.actual_minutes is not None and c.estimated_minutes > 0:
            ratios.append(c.actual_minutes / c.estimated_minutes)
    if not ratios:
        raise ValueError("insufficient_data")
    avg = sum(ratios) / len(ratios)
    # Clamp neutral operational multiplier
    multiplier = max(0.5, min(2.0, round(avg, 3)))
    before = _loads(profile.factors_json, {})
    after = {
        "effort_multiplier": multiplier,
        "sample_count": len(ratios),
        "source": "candidate_declared_actuals",
        "inferred_motivation": False,
        "productivity_score": None,
        "silent_apply": False,
    }
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="estimate_calibration",
        status="pending",
        bundled=False,
        before_json=_dumps(before),
        after_json=_dumps(after),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    cal = CandidateEstimateCalibration(
        candidate_id=candidate_id,
        calibration_key=_uuid("ecal"),
        version=int(profile.version) + 1,
        status="pending",
        before_json=_dumps(before),
        after_json=_dumps(after),
        lifecycle_approval_id=appr.id,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cal)
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="estimate_calibration",
        entity_id=None,
        action="propose",
        before=before,
        after=after,
    )
    db.commit()
    db.refresh(cal)
    return {"calibration": _ser_est_cal(cal), "requires_approval": True, "silent": False}


def resolve_estimate_calibration(
    db: Session, *, candidate_id: int, calibration_id: int, action: str
) -> dict:
    row = (
        db.query(CandidateEstimateCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "pending":
        raise ValueError("calibration_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if row.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=row.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    profile_mutated = False
    if action_u == "approve":
        profile = get_or_create_estimation_profile(db, candidate_id=candidate_id)
        after = _loads(row.after_json, {})
        profile.factors_json = _dumps(after)
        profile.sample_count = int(after.get("sample_count") or 0)
        profile.version = int(row.version)
        profile.updated_at = _utcnow()
        profile_mutated = True
        row.status = "approved"
        # Do NOT rewrite historic approved batches
    elif action_u == "postpone":
        row.status = "postponed"
    else:
        row.status = "rejected"
    row.resolved_at = _utcnow()
    _audit(
        db,
        candidate_id=candidate_id,
        entity_type="estimate_calibration",
        entity_id=row.id,
        action=action_u,
        before={},
        after={"status": row.status, "profile_mutated": profile_mutated},
    )
    db.commit()
    db.refresh(row)
    return {
        "calibration": _ser_est_cal(row),
        "profile_mutated": profile_mutated,
        "historic_batches_rewritten": False,
        "silent": False,
    }


def revert_estimate_calibration(db: Session, *, candidate_id: int, calibration_id: int) -> dict:
    row = (
        db.query(CandidateEstimateCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "approved":
        raise ValueError("calibration_not_approved")
    profile = get_or_create_estimation_profile(db, candidate_id=candidate_id)
    before = _loads(row.before_json, {})
    profile.factors_json = _dumps(before)
    profile.updated_at = _utcnow()
    row.status = "reverted"
    row.resolved_at = _utcnow()
    db.commit()
    return {"calibration": _ser_est_cal(row), "reverted": True, "historic_batches_rewritten": False}


def analyze_commitment_quality(db: Session, *, candidate_id: int, batch_id: int | None = None) -> dict:
    q = db.query(CandidateCommitmentBatch).filter(
        CandidateCommitmentBatch.candidate_id == candidate_id,
        CandidateCommitmentBatch.deleted_at.is_(None),
    )
    if batch_id:
        q = q.filter(CandidateCommitmentBatch.id == batch_id)
    batches = q.order_by(CandidateCommitmentBatch.id.desc()).limit(20).all()
    analyses = []
    for b in batches:
        items = (
            db.query(CandidateCommitmentBatchItem)
            .filter(
                CandidateCommitmentBatchItem.batch_id == b.id,
                CandidateCommitmentBatchItem.deleted_at.is_(None),
            )
            .all()
        )
        completed = sum(1 for it in items if it.status == "completed")
        postponed_batch = b.status == "postponed"
        gaps = _fragmentation_gaps(items)
        body = {
            "batch_id": b.id,
            "status": b.status,
            "item_count": len(items),
            "completed_declared": completed,
            "postponed": postponed_batch,
            "fragmentation": gaps,
            "dependency_bottlenecks": _dependency_hints(items),
            "portfolio_balance": {
                "holds": sum(1 for it in items if it.is_hold),
                "claim_kind": "INFERENCE",
            },
            "productivity_score": None,
            "motivation_inferred": False,
            "employment_success": False,
        }
        row = CandidateCommitmentQualityAnalysis(
            candidate_id=candidate_id,
            analysis_key=_uuid("qual"),
            scope="batch",
            batch_id=b.id,
            body_json=_dumps(body),
            claim_kind="INFERENCE",
            kpi_excluded=True,
            created_at=_utcnow(),
        )
        db.add(row)
        db.flush()
        analyses.append(_ser_qual(row))
    db.commit()
    return {"analyses": analyses, "claim_kind": "INFERENCE"}


def _fragmentation_gaps(items: list[CandidateCommitmentBatchItem]) -> dict:
    timed = sorted(
        [it for it in items if it.starts_at and it.ends_at],
        key=lambda x: x.starts_at or _utcnow(),
    )
    gaps = []
    for a, b in zip(timed, timed[1:]):
        if a.ends_at and b.starts_at:
            gap = (b.starts_at - a.ends_at).total_seconds() / 60.0
            gaps.append(gap)
    return {
        "gap_minutes": gaps,
        "fragment_count": len(gaps),
        "alternatives": [
            {"id": "merge_adjacent", "label": "Merge adjacent holds (internal)", "mutates_external": False},
            {"id": "keep", "label": "Keep spacing", "mutates_external": False},
        ],
        "claim_kind": "INFERENCE",
    }


def _dependency_hints(items: list[CandidateCommitmentBatchItem]) -> list[dict]:
    # Operational: items sharing requirement_id chain — no private-obligation inference
    by_req: dict[int, int] = {}
    for it in items:
        if it.requirement_id:
            by_req[it.requirement_id] = by_req.get(it.requirement_id, 0) + 1
    return [
        {"requirement_id": rid, "item_count": n, "kind": "shared_requirement", "claim_kind": "FACT"}
        for rid, n in by_req.items()
        if n > 1
    ]


def analyze_postponements(db: Session, *, candidate_id: int) -> dict:
    batches = (
        db.query(CandidateCommitmentBatch)
        .filter(
            CandidateCommitmentBatch.candidate_id == candidate_id,
            CandidateCommitmentBatch.deleted_at.is_(None),
            CandidateCommitmentBatch.status == "postponed",
        )
        .all()
    )
    return {
        "postponed_batch_count": len(batches),
        "repeated_review_suggested": len(batches) >= 2,
        "claim_kind": "OBSERVED_INTERNAL_STATE",
        "guilt": False,
        "streak": False,
        "productivity_score": None,
    }


def propose_capacity_calibration(db: Session, *, candidate_id: int) -> dict:
    if not _privacy_ok(db, candidate_id=candidate_id):
        raise ValueError("lifecycle_paused")
    cap = dcc.compute_capacity(db, candidate_id=candidate_id)
    profile = (
        db.query(CandidateCapacityProfile)
        .filter(
            CandidateCapacityProfile.candidate_id == candidate_id,
            CandidateCapacityProfile.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityProfile.id.desc())
        .first()
    )
    if not profile or not profile.weekly_budget_minutes:
        raise ValueError("insufficient_data")
    before = {
        "weekly_budget_minutes": profile.weekly_budget_minutes,
        "explicit_budget_only": True,
    }
    demanded = int(cap.get("demanded_minutes") or 0)
    budget = int(profile.weekly_budget_minutes)
    # Suggest modest bump only if over capacity — candidate must approve
    suggested = budget
    if cap.get("status") == "OVER_CAPACITY" and demanded > budget:
        suggested = min(budget + 60, demanded)
    after = {
        "weekly_budget_minutes": suggested,
        "explicit_budget_only": True,
        "inferred_obligations": False,
        "source": "capacity_compute",
        "productivity_score": None,
        "silent_apply": False,
    }
    if suggested == budget:
        after["note"] = "no_change_needed"
    ctx = life.get_or_create_context(db, candidate_id=candidate_id)
    appr = CandidateLifecycleApproval(
        candidate_id=candidate_id,
        context_id=ctx.id if ctx else None,
        approval_key=_uuid("apr"),
        approval_kind="capacity_calibration",
        status="pending",
        bundled=False,
        before_json=_dumps(before),
        after_json=_dumps(after),
        claim_kind="SUGGESTION",
        created_at=_utcnow(),
    )
    db.add(appr)
    db.flush()
    cal = CandidateCapacityCalibration(
        candidate_id=candidate_id,
        calibration_key=_uuid("ccal"),
        version=1,
        status="pending",
        before_json=_dumps(before),
        after_json=_dumps(after),
        lifecycle_approval_id=appr.id,
        silent=False,
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return {"calibration": _ser_cap_cal(cal), "requires_approval": True, "silent": False}


def resolve_capacity_calibration(
    db: Session, *, candidate_id: int, calibration_id: int, action: str
) -> dict:
    row = (
        db.query(CandidateCapacityCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "pending":
        raise ValueError("calibration_not_pending")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if row.lifecycle_approval_id:
        life.resolve_approval(
            db,
            candidate_id=candidate_id,
            approval_id=row.lifecycle_approval_id,
            approved=(action_u == "approve"),
        )
    capacity_mutated = False
    if action_u == "approve":
        after = _loads(row.after_json, {})
        mins = after.get("weekly_budget_minutes")
        if mins is not None:
            profile = (
                db.query(CandidateCapacityProfile)
                .filter(
                    CandidateCapacityProfile.candidate_id == candidate_id,
                    CandidateCapacityProfile.deleted_at.is_(None),
                )
                .order_by(CandidateCapacityProfile.id.desc())
                .first()
            )
            wins = _loads(profile.windows_json, []) if profile else []
            focus = _loads(profile.protected_focus_json, {"enabled": False}) if profile else None
            tz = (profile.timezone_name if profile else "UTC") or "UTC"
            dcc.upsert_capacity_profile(
                db,
                candidate_id=candidate_id,
                weekly_budget_minutes=int(mins),
                timezone_name=tz,
                windows=wins,
                protected_focus=focus,
            )
            capacity_mutated = True
        row.status = "approved"
    elif action_u == "postpone":
        row.status = "postponed"
    else:
        row.status = "rejected"
    row.resolved_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {
        "calibration": _ser_cap_cal(row),
        "capacity_mutated": capacity_mutated,
        "silent": False,
        "historic_batches_rewritten": False,
    }


def revert_capacity_calibration(db: Session, *, candidate_id: int, calibration_id: int) -> dict:
    row = (
        db.query(CandidateCapacityCalibration)
        .filter_by(id=calibration_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("calibration_not_found")
    if row.status != "approved":
        raise ValueError("calibration_not_approved")
    before = _loads(row.before_json, {})
    mins = before.get("weekly_budget_minutes")
    if mins is not None:
        profile = (
            db.query(CandidateCapacityProfile)
            .filter(
                CandidateCapacityProfile.candidate_id == candidate_id,
                CandidateCapacityProfile.deleted_at.is_(None),
            )
            .order_by(CandidateCapacityProfile.id.desc())
            .first()
        )
        wins = _loads(profile.windows_json, []) if profile else []
        focus = _loads(profile.protected_focus_json, {"enabled": False}) if profile else None
        tz = (profile.timezone_name if profile else "UTC") or "UTC"
        dcc.upsert_capacity_profile(
            db,
            candidate_id=candidate_id,
            weekly_budget_minutes=int(mins),
            timezone_name=tz,
            windows=wins,
            protected_focus=focus,
        )
    row.status = "reverted"
    row.resolved_at = _utcnow()
    db.commit()
    return {"calibration": _ser_cap_cal(row), "reverted": True}


def upsert_execution_policy(db: Session, *, candidate_id: int, body: dict | None = None) -> dict:
    safe = dict(body or {})
    safe["autonomous_external_schedule"] = False
    safe["silent_strategy_change"] = False
    safe["productivity_monitoring"] = False
    row = CandidateExecutionPolicy(
        candidate_id=candidate_id,
        policy_key=_uuid("pol"),
        version=1,
        status="draft",
        body_json=_dumps(safe),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"policy": _ser_policy(row), "requires_approval": True}


def simulate_execution_policy(db: Session, *, candidate_id: int, policy_id: int | None = None) -> dict:
    policy = None
    if policy_id:
        policy = (
            db.query(CandidateExecutionPolicy)
            .filter_by(id=policy_id, candidate_id=candidate_id)
            .one_or_none()
        )
    cap = dcc.compute_capacity(db, candidate_id=candidate_id)
    body = {
        "capacity_status": cap.get("status"),
        "demanded_minutes": cap.get("demanded_minutes"),
        "budget_minutes": cap.get("budget_minutes"),
        "mutates_state": False,
        "external_schedule": False,
        "productivity_score": None,
        "claim_kind": "SUGGESTION",
    }
    sim = CandidateExecutionSimulation(
        candidate_id=candidate_id,
        simulation_key=_uuid("sim"),
        policy_id=policy.id if policy else None,
        mutates_state=False,
        body_json=_dumps(body),
        claim_kind="SUGGESTION",
        kpi_excluded=True,
        created_at=_utcnow(),
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return {"simulation": _ser_sim(sim), "mutates_state": False}


def resolve_execution_policy(
    db: Session, *, candidate_id: int, policy_id: int, action: str
) -> dict:
    row = (
        db.query(CandidateExecutionPolicy)
        .filter_by(id=policy_id, candidate_id=candidate_id)
        .one_or_none()
    )
    if not row or row.deleted_at:
        raise ValueError("policy_not_found")
    action_u = action if action in ("approve", "reject", "postpone") else "reject"
    if action_u == "approve":
        row.status = "approved"
    elif action_u == "postpone":
        row.status = "postponed"
    else:
        row.status = "rejected"
    row.resolved_at = _utcnow()
    db.commit()
    db.refresh(row)
    return {"policy": _ser_policy(row), "silent": False, "external_schedule": False}


def health_overview(db: Session, *, candidate_id: int) -> dict:
    comps = (
        db.query(CandidateEstimateComparison)
        .filter(
            CandidateEstimateComparison.candidate_id == candidate_id,
            CandidateEstimateComparison.deleted_at.is_(None),
        )
        .count()
    )
    post = analyze_postponements(db, candidate_id=candidate_id)
    profile = get_or_create_estimation_profile(db, candidate_id=candidate_id)
    return {
        "comparison_count": comps,
        "postponements": post,
        "estimation_profile": _ser_profile(profile),
        "insight_cards": insight_cards(db, candidate_id=candidate_id),
        "productivity_score": None,
        "motivation_inferred": False,
        "claim_kind": "INFERENCE",
    }


def insight_cards(db: Session, *, candidate_id: int) -> list[dict]:
    cards = []
    post = analyze_postponements(db, candidate_id=candidate_id)
    if post["postponed_batch_count"]:
        cards.append(
            {
                "id": "postponements",
                "title": "Postponed commitment batches",
                "body": f"{post['postponed_batch_count']} postponed batch(es) — review when ready.",
                "claim_kind": "OBSERVED_INTERNAL_STATE",
                "guilt": False,
            }
        )
    comps = (
        db.query(CandidateEstimateComparison)
        .filter(
            CandidateEstimateComparison.candidate_id == candidate_id,
            CandidateEstimateComparison.deleted_at.is_(None),
        )
        .count()
    )
    if comps:
        cards.append(
            {
                "id": "estimates",
                "title": "Estimate vs declared actual",
                "body": f"{comps} comparison(s) available for optional calibration.",
                "claim_kind": "OBSERVED_INTERNAL_STATE",
            }
        )
    else:
        cards.append(
            {
                "id": "insufficient",
                "title": "Insufficient estimate data",
                "body": "Log candidate-declared actual effort on completed holds to enable calibration.",
                "claim_kind": "INSUFFICIENT_DATA",
            }
        )
    return cards


def on_progress_recorded(
    db: Session,
    *,
    candidate_id: int,
    item_id: int,
    actual_effort_minutes: int | None,
    completed: bool,
) -> None:
    """Hook from execution calendar progress — best-effort, never raises to caller."""
    try:
        item = (
            db.query(CandidateCommitmentBatchItem)
            .filter_by(id=item_id, candidate_id=candidate_id)
            .one_or_none()
        )
        record_observation(
            db,
            candidate_id=candidate_id,
            kind="progress",
            batch_id=item.batch_id if item else None,
            item_id=item_id,
            body={
                "actual_effort_minutes": actual_effort_minutes,
                "completed": completed,
                "inferred_completion": False,
            },
            claim_kind="CANDIDATE_DECLARED",
        )
        if actual_effort_minutes is not None:
            compare_estimate_vs_actual(
                db,
                candidate_id=candidate_id,
                item_id=item_id,
                actual_minutes=int(actual_effort_minutes),
            )
    except Exception as exc:
        logger.exception("adaptive progress hook failed: %s", exc)


def export_intelligence(db: Session, *, candidate_id: int) -> dict:
    return {
        "schema": SCHEMA,
        "observations": [
            _ser_obs(o)
            for o in db.query(CandidateExecutionObservation)
            .filter_by(candidate_id=candidate_id)
            .filter(CandidateExecutionObservation.deleted_at.is_(None))
            .limit(100)
            .all()
        ],
        "kpi_excluded": True,
        "productivity_score_excluded": True,
    }


def delete_intelligence_history(db: Session, *, candidate_id: int) -> dict:
    now = _utcnow()
    n = 0
    for model in (
        CandidateExecutionObservation,
        CandidateEstimateSnapshot,
        CandidateEstimateComparison,
        CandidateEstimationProfile,
        CandidateEstimateCalibration,
        CandidateCommitmentQualityAnalysis,
        CandidateCapacityCalibration,
        CandidateExecutionPolicy,
        CandidateExecutionSimulation,
    ):
        for row in db.query(model).filter(model.candidate_id == candidate_id).all():
            if hasattr(row, "deleted_at") and row.deleted_at is None:
                row.deleted_at = now
                n += 1
    db.commit()
    return {"deleted": n, "propagated": True}


def build_aggregate(db: Session, *, candidate_id: int) -> dict:
    profile = get_or_create_estimation_profile(db, candidate_id=candidate_id)
    health = health_overview(db, candidate_id=candidate_id)
    est_cals = (
        db.query(CandidateEstimateCalibration)
        .filter(
            CandidateEstimateCalibration.candidate_id == candidate_id,
            CandidateEstimateCalibration.deleted_at.is_(None),
        )
        .order_by(CandidateEstimateCalibration.id.desc())
        .limit(20)
        .all()
    )
    cap_cals = (
        db.query(CandidateCapacityCalibration)
        .filter(
            CandidateCapacityCalibration.candidate_id == candidate_id,
            CandidateCapacityCalibration.deleted_at.is_(None),
        )
        .order_by(CandidateCapacityCalibration.id.desc())
        .limit(20)
        .all()
    )
    return {
        "schema": SCHEMA,
        "alembic": ALEMBIC,
        "estimation_profile": _ser_profile(profile),
        "estimate_calibrations": [_ser_est_cal(c) for c in est_cals],
        "capacity_calibrations": [_ser_cap_cal(c) for c in cap_cals],
        "health": health,
        "postponements": analyze_postponements(db, candidate_id=candidate_id),
        "routes": {
            "home": "/dashboard/execution-intelligence",
            "estimates": "/dashboard/execution-intelligence?view=estimates",
            "quality": "/dashboard/execution-intelligence?view=quality",
            "capacity": "/dashboard/execution-intelligence?view=capacity",
            "policy": "/dashboard/execution-intelligence?view=policy",
            "execution_calendar": "/dashboard/execution-calendar",
            "approvals": "/dashboard/approvals",
            "daily_os_canonical": CANONICAL_DAILY_OS,
            "api": "/api/v1/candidates/me/execution-intelligence",
        },
        "safety": {
            "inferred_actual_effort": False,
            "productivity_score": False,
            "motivation_inference": False,
            "mental_health_inference": False,
            "silent_estimate_change": False,
            "silent_capacity_change": False,
            "silent_strategy_change": False,
            "historic_batches_rewritten": False,
            "guilt_streaks": False,
            "calendar_as_employment_success": False,
            "phase_3_career_agent": "NOT_STARTED",
            "microsoft_calendar_write": False,
        },
        "truth_labels": [
            "FACT",
            "SOURCE_SUPPORTED",
            "CANDIDATE_DECLARED",
            "CANDIDATE_CONFIRMED",
            "OBSERVED_INTERNAL_STATE",
            "INFERENCE",
            "SUGGESTION",
            "UNKNOWN",
            "INSUFFICIENT_DATA",
            "CONFLICTING",
            "STALE",
        ],
        "kpi_excluded": True,
    }


def _ser_obs(o: CandidateExecutionObservation) -> dict:
    return {
        "id": o.id,
        "kind": o.kind,
        "batch_id": o.batch_id,
        "item_id": o.item_id,
        "body": _loads(o.body_json, {}),
        "claim_kind": o.claim_kind,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    }


def _ser_snap(s: CandidateEstimateSnapshot) -> dict:
    return {
        "id": s.id,
        "batch_id": s.batch_id,
        "item_id": s.item_id,
        "estimated_minutes": s.estimated_minutes,
        "source": s.source,
        "claim_kind": s.claim_kind,
    }


def _ser_cmp(c: CandidateEstimateComparison) -> dict:
    return {
        "id": c.id,
        "snapshot_id": c.snapshot_id,
        "item_id": c.item_id,
        "estimated_minutes": c.estimated_minutes,
        "actual_minutes": c.actual_minutes,
        "delta_minutes": c.delta_minutes,
        "ratio": _loads(c.ratio_json, {}),
        "claim_kind": c.claim_kind,
    }


def _ser_profile(p: CandidateEstimationProfile) -> dict:
    return {
        "id": p.id,
        "version": p.version,
        "status": p.status,
        "factors": _loads(p.factors_json, {}),
        "sample_count": p.sample_count,
        "claim_kind": p.claim_kind,
    }


def _ser_est_cal(c: CandidateEstimateCalibration) -> dict:
    return {
        "id": c.id,
        "version": c.version,
        "status": c.status,
        "before": _loads(c.before_json, {}),
        "after": _loads(c.after_json, {}),
        "silent": False,
        "lifecycle_approval_id": c.lifecycle_approval_id,
        "requires_approval": c.status == "pending",
        "claim_kind": c.claim_kind,
    }


def _ser_cap_cal(c: CandidateCapacityCalibration) -> dict:
    return {
        "id": c.id,
        "version": c.version,
        "status": c.status,
        "before": _loads(c.before_json, {}),
        "after": _loads(c.after_json, {}),
        "silent": False,
        "lifecycle_approval_id": c.lifecycle_approval_id,
        "requires_approval": c.status == "pending",
        "claim_kind": c.claim_kind,
    }


def _ser_qual(q: CandidateCommitmentQualityAnalysis) -> dict:
    return {
        "id": q.id,
        "scope": q.scope,
        "batch_id": q.batch_id,
        "body": _loads(q.body_json, {}),
        "claim_kind": q.claim_kind,
    }


def _ser_policy(p: CandidateExecutionPolicy) -> dict:
    return {
        "id": p.id,
        "version": p.version,
        "status": p.status,
        "body": _loads(p.body_json, {}),
        "claim_kind": p.claim_kind,
    }


def _ser_sim(s: CandidateExecutionSimulation) -> dict:
    return {
        "id": s.id,
        "policy_id": s.policy_id,
        "mutates_state": False,
        "body": _loads(s.body_json, {}),
        "claim_kind": s.claim_kind,
    }
