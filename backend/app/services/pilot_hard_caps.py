"""Pilot hard caps — transactional cohort/canary/gen/send limits.

Absolute product max: cohort ≤ 3, canary ≤ 1.
Default effective production caps remain 0 (fail-closed) until Founder canary.
Reservations use atomic SQL UPDATE … WHERE used+n ≤ limit (PostgreSQL-safe).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.models import PilotCapBucket

SCHEMA = "twin.pilot_hard_caps/v1"

ABS_COHORT = 3
ABS_CANARY = 1
# Default effective production caps — real invite create/send remain blocked
# until an authorized canary flips limits under ACTIVE_INVITE_ONLY_CANARY.
EFF_REAL_COHORT = 0
EFF_CANARY = 0
EFF_GENERATION = 0
EFF_SEND = 0

BUCKET_REAL_COHORT = "real_cohort"
BUCKET_CANARY = "canary"
BUCKET_GENERATION = "real_generation"
BUCKET_SEND = "real_send"

# Isolated synthetic buckets for concurrency proofs (never real invites).
SYNTH_BUCKET_PREFIX = "synth_p2_"

DEFAULTS: dict[str, tuple[int, int]] = {
    BUCKET_REAL_COHORT: (ABS_COHORT, EFF_REAL_COHORT),
    BUCKET_CANARY: (ABS_CANARY, EFF_CANARY),
    BUCKET_GENERATION: (ABS_COHORT, EFF_GENERATION),
    BUCKET_SEND: (ABS_COHORT, EFF_SEND),
}


def _utcnow() -> datetime:
    return datetime.utcnow()


def _is_allowed_bucket(bucket_key: str) -> bool:
    return bucket_key in DEFAULTS or bucket_key.startswith(SYNTH_BUCKET_PREFIX)


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
            # Keep absolute_max authoritative; do not clobber runtime overrides of effective_limit.
            row.absolute_max = abs_max
            row.updated_at = _utcnow()
    db.commit()


def ensure_isolated_synth_bucket(
    db: Session,
    *,
    bucket_key: str,
    absolute_max: int = 1,
    effective_limit: int = 1,
    reset_used: bool = True,
) -> PilotCapBucket:
    """Create/reset an isolated synthetic cap bucket for concurrency proofs."""
    if not bucket_key.startswith(SYNTH_BUCKET_PREFIX):
        raise ValueError("synth_bucket_prefix_required")
    row = db.query(PilotCapBucket).filter(PilotCapBucket.bucket_key == bucket_key).one_or_none()
    if row is None:
        row = PilotCapBucket(
            bucket_key=bucket_key,
            absolute_max=int(absolute_max),
            effective_limit=int(effective_limit),
            used_count=0,
            updated_at=_utcnow(),
            created_at=_utcnow(),
            kpi_excluded=True,
            claim_kind="FACT",
        )
        db.add(row)
    else:
        row.absolute_max = int(absolute_max)
        row.effective_limit = int(effective_limit)
        if reset_used:
            row.used_count = 0
        row.updated_at = _utcnow()
        row.kpi_excluded = True
    db.commit()
    db.refresh(row)
    return row


def reset_effective_limits_to_epic_defaults(db: Session) -> None:
    """Ops/reset helper — restores fail-closed effective caps (0) on real buckets."""
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
        base["used"] = {
            r.bucket_key: int(r.used_count or 0)
            for r in rows
            if not str(r.bucket_key).startswith(SYNTH_BUCKET_PREFIX)
        }
        # Reflect live effective limits from DB when present (canary may raise to 1).
        by_key = {r.bucket_key: r for r in rows}
        for logical, key in (
            ("real_cohort", BUCKET_REAL_COHORT),
            ("canary", BUCKET_CANARY),
            ("generation", BUCKET_GENERATION),
            ("send", BUCKET_SEND),
        ):
            row = by_key.get(key)
            if row is not None:
                base["effective"][logical] = int(row.effective_limit)
    except Exception:
        pass
    return base


def try_reserve(db: Session, *, bucket_key: str, n: int = 1) -> tuple[bool, str]:
    """Atomic reserve under concurrency (PostgreSQL-safe single-statement UPDATE)."""
    if n < 1:
        return False, "invalid_n"
    if not _is_allowed_bucket(bucket_key):
        return False, "unknown_bucket"
    try:
        if bucket_key in DEFAULTS:
            ensure_buckets(db)
        elif db.query(PilotCapBucket).filter_by(bucket_key=bucket_key).one_or_none() is None:
            return False, "bucket_missing"
    except Exception:
        return False, "cap_store_unavailable"

    for _ in range(5):
        try:
            # Atomic compare-and-increment — no TOCTOU between read and write.
            result = db.execute(
                text(
                    """
                    UPDATE pilot_cap_buckets
                    SET used_count = used_count + :n,
                        updated_at = :ts
                    WHERE bucket_key = :key
                      AND used_count + :n <= effective_limit
                    RETURNING used_count, effective_limit
                    """
                ),
                {"n": int(n), "key": bucket_key, "ts": _utcnow()},
            )
            row = result.fetchone()
            if row is None:
                db.rollback()
                # Distinguish missing vs exceeded
                exists = (
                    db.query(PilotCapBucket.id)
                    .filter(PilotCapBucket.bucket_key == bucket_key)
                    .one_or_none()
                )
                if exists is None:
                    return False, "bucket_missing"
                return False, "cap_exceeded"
            db.commit()
            return True, "reserved"
        except Exception:
            db.rollback()
            continue
    return False, "reserve_conflict"


def release_reservation(db: Session, *, bucket_key: str, n: int = 1) -> None:
    if n < 1 or not _is_allowed_bucket(bucket_key):
        return
    try:
        db.execute(
            text(
                """
                UPDATE pilot_cap_buckets
                SET used_count = CASE
                    WHEN used_count >= :n THEN used_count - :n
                    ELSE 0
                END,
                    updated_at = :ts
                WHERE bucket_key = :key
                """
            ),
            {"n": int(n), "key": bucket_key, "ts": _utcnow()},
        )
        db.commit()
    except Exception:
        db.rollback()


def assert_real_invite_create_blocked(db: Session) -> tuple[bool, str]:
    """Real invite create must fail while effective gen cap = 0."""
    ok, reason = try_reserve(db, bucket_key=BUCKET_GENERATION, n=1)
    if ok:
        release_reservation(db, bucket_key=BUCKET_GENERATION, n=1)
        return False, "unexpected_reserve"
    return False, reason
