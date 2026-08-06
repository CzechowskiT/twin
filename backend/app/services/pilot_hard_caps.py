"""Epic 2.10 — transactional hard caps for real cohort / canary / gen / send.

Absolute product max: cohort ≤ 3, canary ≤ 1.
Effective production caps during Epic 2.10: all real buckets = 0 (fail-closed).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import PilotCapBucket

SCHEMA = "twin.pilot_hard_caps/v1"

ABS_COHORT = 3
ABS_CANARY = 1
# Epic 2.10 effective production caps — real invite create/send remain blocked.
EFF_REAL_COHORT = 0
EFF_CANARY = 0
EFF_GENERATION = 0
EFF_SEND = 0

BUCKET_REAL_COHORT = "real_cohort"
BUCKET_CANARY = "canary"
BUCKET_GENERATION = "real_generation"
BUCKET_SEND = "real_send"

DEFAULTS: dict[str, tuple[int, int]] = {
    BUCKET_REAL_COHORT: (ABS_COHORT, EFF_REAL_COHORT),
    BUCKET_CANARY: (ABS_CANARY, EFF_CANARY),
    BUCKET_GENERATION: (ABS_COHORT, EFF_GENERATION),
    BUCKET_SEND: (ABS_COHORT, EFF_SEND),
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def ensure_buckets(db: Session) -> None:
    for key, (abs_max, eff) in DEFAULTS.items():
        row = db.query(PilotCapBucket).filter(PilotCapBucket.bucket_key == key).one_or_none()
        if row is None:
            db.add(
                PilotCapBucket(
                    bucket_key=key,
                    absolute_max=abs_max,
                    effective_limit=eff,
                    used_count=0,
                    updated_at=_utcnow(),
                    created_at=_utcnow(),
                    kpi_excluded=True,
                )
            )
        else:
            # Keep absolute_max authoritative; do not clobber runtime test overrides of effective_limit.
            row.absolute_max = abs_max
            row.updated_at = _utcnow()
    db.commit()


def reset_effective_limits_to_epic_defaults(db: Session) -> None:
    """Ops/reset helper — restores Epic 2.10 fail-closed effective caps (0)."""
    ensure_buckets(db)
    for key, (_abs_max, eff) in DEFAULTS.items():
        row = db.query(PilotCapBucket).filter(PilotCapBucket.bucket_key == key).one_or_none()
        if row is not None:
            row.effective_limit = eff
            row.updated_at = _utcnow()
    db.commit()


def caps_snapshot(db: Session | None = None) -> dict[str, Any]:
    base = {
        "schema": SCHEMA,
        "absolute": {"cohort": ABS_COHORT, "canary": ABS_CANARY},
        "effective": {
            "real_cohort": EFF_REAL_COHORT,
            "canary": EFF_CANARY,
            "generation": EFF_GENERATION,
            "send": EFF_SEND,
        },
        "used": {},
        "claim_kind": "FACT",
        "kpi_excluded": True,
    }
    if db is None:
        return base
    try:
        ensure_buckets(db)
        rows = db.query(PilotCapBucket).all()
        base["used"] = {r.bucket_key: int(r.used_count or 0) for r in rows}
    except Exception:
        pass
    return base


def try_reserve(db: Session, *, bucket_key: str, n: int = 1) -> tuple[bool, str]:
    """Atomic reserve under concurrency. Retries on conflict."""
    if n < 1:
        return False, "invalid_n"
    if bucket_key not in DEFAULTS:
        return False, "unknown_bucket"
    try:
        ensure_buckets(db)
    except Exception:
        return False, "cap_store_unavailable"
    for _ in range(3):
        q = db.query(PilotCapBucket).filter(PilotCapBucket.bucket_key == bucket_key)
        try:
            row = q.with_for_update().one_or_none()
        except Exception:
            row = q.one_or_none()
        if row is None:
            return False, "bucket_missing"
        limit = int(row.effective_limit)
        used = int(row.used_count or 0)
        if used + n > limit:
            return False, "cap_exceeded"
        row.used_count = used + n
        row.updated_at = _utcnow()
        try:
            db.commit()
            return True, "reserved"
        except Exception:
            db.rollback()
            try:
                ensure_buckets(db)
            except Exception:
                return False, "cap_store_unavailable"
            continue
    return False, "reserve_conflict"


def release_reservation(db: Session, *, bucket_key: str, n: int = 1) -> None:
    ensure_buckets(db)
    row = (
        db.query(PilotCapBucket)
        .filter(PilotCapBucket.bucket_key == bucket_key)
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        return
    row.used_count = max(0, int(row.used_count or 0) - max(0, n))
    row.updated_at = _utcnow()
    db.commit()


def assert_real_invite_create_blocked(db: Session) -> tuple[bool, str]:
    """Real invite create must fail during Epic 2.10 (effective gen cap = 0)."""
    ok, reason = try_reserve(db, bucket_key=BUCKET_GENERATION, n=1)
    if ok:
        # Should be unreachable when effective=0; roll back if somehow reserved.
        release_reservation(db, bucket_key=BUCKET_GENERATION, n=1)
        return False, "unexpected_reserve"
    return False, reason
