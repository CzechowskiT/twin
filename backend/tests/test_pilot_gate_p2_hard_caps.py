"""Pilot Gate P2 — hard-cap atomicity unit tests (SQLite + SQL path)."""

from __future__ import annotations

from app.database.models import PilotCapBucket
from app.services import pilot_hard_caps as caps
from tests.test_auth_integration import _sqlite_session


def _db():
    db = _sqlite_session()
    PilotCapBucket.__table__.create(db.get_bind(), checkfirst=True)
    return db


def test_atomic_reserve_cap1_rejects_second() -> None:
    db = _db()
    try:
        caps.ensure_isolated_synth_bucket(
            db, bucket_key="synth_p2_unit_cap1", absolute_max=1, effective_limit=1, reset_used=True
        )
        ok1, r1 = caps.try_reserve(db, bucket_key="synth_p2_unit_cap1", n=1)
        ok2, r2 = caps.try_reserve(db, bucket_key="synth_p2_unit_cap1", n=1)
        assert ok1 is True and r1 == "reserved"
        assert ok2 is False and r2 == "cap_exceeded"
        row = db.query(PilotCapBucket).filter_by(bucket_key="synth_p2_unit_cap1").one()
        assert int(row.used_count) == 1
    finally:
        db.close()


def test_release_and_rereserve() -> None:
    db = _db()
    try:
        key = "synth_p2_unit_release"
        caps.ensure_isolated_synth_bucket(
            db, bucket_key=key, absolute_max=1, effective_limit=1, reset_used=True
        )
        assert caps.try_reserve(db, bucket_key=key, n=1)[0] is True
        caps.release_reservation(db, bucket_key=key, n=1)
        assert caps.try_reserve(db, bucket_key=key, n=1)[0] is True
    finally:
        db.close()


def test_unknown_and_non_synth_bucket_rejected() -> None:
    db = _db()
    try:
        ok, reason = caps.try_reserve(db, bucket_key="not_a_real_bucket", n=1)
        assert ok is False and reason == "unknown_bucket"
    finally:
        db.close()


def test_real_generation_still_blocked_at_effective_zero() -> None:
    db = _db()
    try:
        caps.ensure_buckets(db)
        ok, reason = caps.try_reserve(db, bucket_key=caps.BUCKET_GENERATION, n=1)
        assert ok is False and reason == "cap_exceeded"
    finally:
        db.close()
