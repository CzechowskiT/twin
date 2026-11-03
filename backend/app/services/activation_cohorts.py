"""Activation cohort registry + evidence summaries for pilot fill ops."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    ActivationCohort,
    ActivationCohortParticipant,
    ProductFunnelEvent,
    User,
)
from app.services.activation_ttv_metrics import build_activation_funnel_extension
from app.services.product_funnel import NORTH_STAR_EVENTS, build_funnel_snapshot

COHORT_TYPES = frozenset({"candidate", "recruiter", "employer", "mixed"})
COHORT_STATUSES = frozenset(
    {"draft", "recruiting", "active", "paused", "completed", "cancelled"}
)
PARTICIPANT_ROLES = frozenset({"candidate", "recruiter", "employer"})
PARTICIPANT_STATUSES = frozenset(
    {"invited", "joined", "onboarded", "activated", "churned", "excluded"}
)

_STEP_EVENTS = (
    "signup_completed",
    "onboarding_completed",
    "first_match",
    "application_created",
    "interview_scheduled",
    "placement_verified",
)


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    text = raw.strip().replace("Z", "")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def cohort_to_dict(c: ActivationCohort, *, participant_count: int | None = None) -> dict[str, Any]:
    return {
        "id": c.id,
        "name": c.name,
        "cohort_type": c.cohort_type,
        "market": c.market,
        "language": c.language,
        "starts_at": c.starts_at.isoformat() + "Z" if c.starts_at else None,
        "ends_at": c.ends_at.isoformat() + "Z" if c.ends_at else None,
        "target_count": c.target_count,
        "status": c.status,
        "owner": c.owner,
        "source": c.source,
        "campaign": c.campaign,
        "notes": c.notes,
        "participant_count": participant_count,
        "created_at": c.created_at.isoformat() + "Z" if c.created_at else None,
        "updated_at": c.updated_at.isoformat() + "Z" if c.updated_at else None,
    }


def participant_to_dict(p: ActivationCohortParticipant, *, email: str | None = None) -> dict[str, Any]:
    return {
        "id": p.id,
        "cohort_id": p.cohort_id,
        "user_id": p.user_id,
        "email": email,
        "role": p.role,
        "joined_at": p.joined_at.isoformat() + "Z" if p.joined_at else None,
        "source": p.source,
        "status": p.status,
        "exclude_from_product_metrics": bool(p.exclude_from_product_metrics),
        "notes": p.notes,
    }


def list_cohorts(db: Session, *, status: str | None = None) -> list[dict[str, Any]]:
    q = db.query(ActivationCohort).order_by(ActivationCohort.id.desc())
    if status:
        q = q.filter(ActivationCohort.status == status)
    rows = q.all()
    counts = dict(
        db.query(
            ActivationCohortParticipant.cohort_id,
            func.count(ActivationCohortParticipant.id),
        )
        .group_by(ActivationCohortParticipant.cohort_id)
        .all()
    )
    return [cohort_to_dict(c, participant_count=int(counts.get(c.id, 0))) for c in rows]


def create_cohort(db: Session, payload: dict[str, Any]) -> ActivationCohort:
    ctype = (payload.get("cohort_type") or "candidate").strip().lower()
    if ctype not in COHORT_TYPES:
        raise ValueError(f"cohort_type must be one of {sorted(COHORT_TYPES)}")
    status = (payload.get("status") or "draft").strip().lower()
    if status not in COHORT_STATUSES:
        raise ValueError(f"status must be one of {sorted(COHORT_STATUSES)}")
    name = (payload.get("name") or "").strip()
    if not name or len(name) > 200:
        raise ValueError("name is required (max 200 chars)")
    target = int(payload.get("target_count") or 50)
    if target < 1 or target > 10_000:
        raise ValueError("target_count must be 1–10000")
    cohort = ActivationCohort(
        name=name,
        cohort_type=ctype,
        market=(payload.get("market") or "PL").strip()[:64] or "PL",
        language=(payload.get("language") or "pl").strip()[:16] or "pl",
        starts_at=_parse_dt(payload.get("starts_at")),
        ends_at=_parse_dt(payload.get("ends_at")),
        target_count=target,
        status=status,
        owner=(payload.get("owner") or None),
        source=(payload.get("source") or None),
        campaign=(payload.get("campaign") or None),
        notes=(payload.get("notes") or None),
    )
    db.add(cohort)
    db.commit()
    db.refresh(cohort)
    return cohort


def update_cohort(db: Session, cohort_id: int, payload: dict[str, Any]) -> ActivationCohort:
    cohort = db.query(ActivationCohort).filter(ActivationCohort.id == cohort_id).first()
    if not cohort:
        raise ValueError("Cohort not found")
    if "name" in payload and payload["name"] is not None:
        name = str(payload["name"]).strip()
        if not name or len(name) > 200:
            raise ValueError("name is required (max 200 chars)")
        cohort.name = name
    if "cohort_type" in payload and payload["cohort_type"] is not None:
        ctype = str(payload["cohort_type"]).strip().lower()
        if ctype not in COHORT_TYPES:
            raise ValueError(f"cohort_type must be one of {sorted(COHORT_TYPES)}")
        cohort.cohort_type = ctype
    if "status" in payload and payload["status"] is not None:
        status = str(payload["status"]).strip().lower()
        if status not in COHORT_STATUSES:
            raise ValueError(f"status must be one of {sorted(COHORT_STATUSES)}")
        cohort.status = status
    for field in ("market", "language", "owner", "source", "campaign", "notes"):
        if field in payload:
            val = payload[field]
            setattr(cohort, field, None if val is None else str(val)[:200])
    if "target_count" in payload and payload["target_count"] is not None:
        target = int(payload["target_count"])
        if target < 1 or target > 10_000:
            raise ValueError("target_count must be 1–10000")
        cohort.target_count = target
    if "starts_at" in payload:
        cohort.starts_at = _parse_dt(payload.get("starts_at"))
    if "ends_at" in payload:
        cohort.ends_at = _parse_dt(payload.get("ends_at"))
    cohort.updated_at = datetime.utcnow()
    db.add(cohort)
    db.commit()
    db.refresh(cohort)
    return cohort


def get_cohort(db: Session, cohort_id: int) -> ActivationCohort | None:
    return db.query(ActivationCohort).filter(ActivationCohort.id == cohort_id).first()


def list_participants(db: Session, cohort_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(ActivationCohortParticipant, User.email)
        .join(User, User.id == ActivationCohortParticipant.user_id)
        .filter(ActivationCohortParticipant.cohort_id == cohort_id)
        .order_by(ActivationCohortParticipant.id.asc())
        .all()
    )
    return [participant_to_dict(p, email=email) for p, email in rows]


def add_participant(
    db: Session,
    cohort_id: int,
    *,
    user_id: int | None = None,
    email: str | None = None,
    role: str = "candidate",
    source: str | None = None,
    status: str = "joined",
    exclude_from_product_metrics: bool | None = None,
    notes: str | None = None,
) -> ActivationCohortParticipant:
    cohort = get_cohort(db, cohort_id)
    if not cohort:
        raise ValueError("Cohort not found")
    role_n = role.strip().lower()
    if role_n not in PARTICIPANT_ROLES:
        raise ValueError(f"role must be one of {sorted(PARTICIPANT_ROLES)}")
    status_n = status.strip().lower()
    if status_n not in PARTICIPANT_STATUSES:
        raise ValueError(f"status must be one of {sorted(PARTICIPANT_STATUSES)}")
    user: User | None = None
    if user_id is not None:
        user = db.query(User).filter(User.id == user_id).first()
    elif email:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        raise ValueError("User not found")
    existing = (
        db.query(ActivationCohortParticipant)
        .filter(
            ActivationCohortParticipant.cohort_id == cohort_id,
            ActivationCohortParticipant.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise ValueError("User already in cohort")
    inherit = (
        bool(exclude_from_product_metrics)
        if exclude_from_product_metrics is not None
        else bool(user.exclude_from_product_metrics)
    )
    if inherit and not user.exclude_from_product_metrics:
        user.exclude_from_product_metrics = True
        db.add(user)
    if status_n == "excluded":
        inherit = True
        user.exclude_from_product_metrics = True
        db.add(user)
    part = ActivationCohortParticipant(
        cohort_id=cohort_id,
        user_id=user.id,
        role=role_n,
        source=source or cohort.source,
        status=status_n,
        exclude_from_product_metrics=inherit,
        notes=notes,
    )
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


def update_participant(
    db: Session,
    cohort_id: int,
    participant_id: int,
    payload: dict[str, Any],
) -> ActivationCohortParticipant:
    part = (
        db.query(ActivationCohortParticipant)
        .filter(
            ActivationCohortParticipant.id == participant_id,
            ActivationCohortParticipant.cohort_id == cohort_id,
        )
        .first()
    )
    if not part:
        raise ValueError("Participant not found")
    if "status" in payload and payload["status"] is not None:
        status_n = str(payload["status"]).strip().lower()
        if status_n not in PARTICIPANT_STATUSES:
            raise ValueError(f"status must be one of {sorted(PARTICIPANT_STATUSES)}")
        part.status = status_n
        if status_n == "excluded":
            part.exclude_from_product_metrics = True
            user = db.query(User).filter(User.id == part.user_id).first()
            if user:
                user.exclude_from_product_metrics = True
                db.add(user)
    if "exclude_from_product_metrics" in payload and payload["exclude_from_product_metrics"] is not None:
        flag = bool(payload["exclude_from_product_metrics"])
        part.exclude_from_product_metrics = flag
        if flag:
            user = db.query(User).filter(User.id == part.user_id).first()
            if user:
                user.exclude_from_product_metrics = True
                db.add(user)
    if "role" in payload and payload["role"] is not None:
        role_n = str(payload["role"]).strip().lower()
        if role_n not in PARTICIPANT_ROLES:
            raise ValueError(f"role must be one of {sorted(PARTICIPANT_ROLES)}")
        part.role = role_n
    if "source" in payload:
        part.source = payload["source"]
    if "notes" in payload:
        part.notes = payload["notes"]
    part.updated_at = datetime.utcnow()
    db.add(part)
    db.commit()
    db.refresh(part)
    return part


def remove_participant(db: Session, cohort_id: int, participant_id: int) -> None:
    part = (
        db.query(ActivationCohortParticipant)
        .filter(
            ActivationCohortParticipant.id == participant_id,
            ActivationCohortParticipant.cohort_id == cohort_id,
        )
        .first()
    )
    if not part:
        raise ValueError("Participant not found")
    db.delete(part)
    db.commit()


def build_cohort_evidence(db: Session, cohort_id: int) -> dict[str, Any]:
    """Counts by step, TTV sample, NS excl/incl test — for pilot evidence pack."""
    cohort = get_cohort(db, cohort_id)
    if not cohort:
        raise ValueError("Cohort not found")
    parts = (
        db.query(ActivationCohortParticipant)
        .filter(ActivationCohortParticipant.cohort_id == cohort_id)
        .all()
    )
    user_ids = [p.user_id for p in parts]
    status_counts: dict[str, int] = {}
    for p in parts:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1
    excluded_ids = {p.user_id for p in parts if p.exclude_from_product_metrics}
    real_ids = [uid for uid in user_ids if uid not in excluded_ids]

    def _step_counts(ids: list[int]) -> dict[str, int]:
        if not ids:
            return {e: 0 for e in _STEP_EVENTS}
        out: dict[str, int] = {}
        for name in _STEP_EVENTS:
            cnt = (
                db.query(func.count(func.distinct(ProductFunnelEvent.user_id)))
                .filter(
                    ProductFunnelEvent.event_name == name,
                    ProductFunnelEvent.user_id.in_(tuple(ids)),
                )
                .scalar()
                or 0
            )
            out[name] = int(cnt)
        return out

    steps_excl = _step_counts(real_ids)
    steps_incl = _step_counts(user_ids)

    def _ns(ids: list[int]) -> int:
        if not ids:
            return 0
        return int(
            db.query(func.count(func.distinct(ProductFunnelEvent.user_id)))
            .filter(
                ProductFunnelEvent.event_name.in_(tuple(NORTH_STAR_EVENTS)),
                ProductFunnelEvent.user_id.in_(tuple(ids)),
            )
            .scalar()
            or 0
        )

    ttv = None
    try:
        ttv = build_activation_funnel_extension(
            db,
            days=90,
            persona="candidate",
            include_test_accounts=False,
        )
    except Exception:
        ttv = None
    ttv_sample = None
    if isinstance(ttv, dict):
        lat = ttv.get("ttv_latencies") or {}
        pairs = lat.get("pairs") or {}
        fm = pairs.get("signup_to_first_match") or {}
        ttv_sample = fm.get("sample_size")

    funnel_excl = build_funnel_snapshot(db, days=30, include_test_accounts=False)
    funnel_incl = build_funnel_snapshot(db, days=30, include_test_accounts=True)

    blockers: list[str] = []
    if len(real_ids) < 1:
        blockers.append("no_real_participants")
    if steps_excl.get("onboarding_completed", 0) < 1 and len(real_ids) > 0:
        blockers.append("no_onboarding_yet")
    if steps_excl.get("first_match", 0) < 1 and steps_excl.get("onboarding_completed", 0) > 0:
        blockers.append("onboarded_without_first_match")
    if cohort.status in {"draft", "recruiting"} and len(parts) < cohort.target_count:
        blockers.append("below_target_count")
    from app.services.pilot_stance import PILOT_BLOCKED, resolve_pilot_stance

    if resolve_pilot_stance() == PILOT_BLOCKED:
        blockers.append("PILOT_BLOCKED_BY_FOUNDER")
        blockers.append("FOUNDERS_ACTION_REQUIRED_recruit_users")
    else:
        blockers.append("PILOT_READY_FOR_CONTROLLED_PILOT")
    # External mass enrollment stays OFF even when controlled pilot is READY.
    blockers.append("EXTERNAL_ENROLLMENT_NOT_STARTED")

    return {
        "cohort": cohort_to_dict(cohort, participant_count=len(parts)),
        "participant_status_counts": status_counts,
        "participants_total": len(parts),
        "participants_real": len(real_ids),
        "participants_excluded_metrics": len(excluded_ids),
        "steps_excluding_test": steps_excl,
        "steps_including_test_labeled": {
            **steps_incl,
            "_label": "includes exclude_from_product_metrics participants",
        },
        "north_star_excluding_test": _ns(real_ids),
        "north_star_including_test_labeled": {
            "value": _ns(user_ids),
            "label": "includes test/smoke participants — do not use for Gate F",
        },
        "global_north_star_7d_excluding_test": funnel_excl.get("north_star", {}).get("value_7d"),
        "global_north_star_7d_including_test": funnel_incl.get("north_star", {}).get("value_7d"),
        "ttv_signup_to_first_match_sample_size": ttv_sample,
        "blockers": blockers,
        "gates": {
            "gate_f": "PASS",
            "pilot": resolve_pilot_stance(),
            "launch": "NO-GO",
            "phase_3b": "BLOCKED",
            "enrollment": "OFF",
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


def ensure_default_pl_pilot_cohort(db: Session) -> ActivationCohort:
    """Idempotent seed for the PL activation pilot — draft until Founder recruits."""
    existing = (
        db.query(ActivationCohort)
        .filter(ActivationCohort.campaign == "activation_pl_pilot_2026_07")
        .first()
    )
    if existing:
        return existing
    return create_cohort(
        db,
        {
            "name": "PL Activation Pilot Jul 2026",
            "cohort_type": "mixed",
            "market": "PL",
            "language": "pl",
            "target_count": 50,
            "status": "recruiting",
            "owner": "Founder",
            "source": "founder_invite",
            "campaign": "activation_pl_pilot_2026_07",
            "notes": (
                "Controlled pilot: 20–50 PL candidates + 3–5 recruiters. "
                "Invite via utm_source=pilot&utm_campaign=activation_pl_pilot_2026_07&utm_content=cohort_{id}. "
                "FOUNDERS_ACTION_REQUIRED — do not claim recruitment done until invites accepted."
            ),
        },
    )
