"""Pilot Gate P2 — PostgreSQL hard-cap concurrency proof (isolated synth bucket).

Proves effective cap=1 under multi-process concurrent reservations against
production-equivalent PostgreSQL. Never touches real invite generation/send.
Never prints secrets or recipient PII.
"""

from __future__ import annotations

import json
import multiprocessing as mp
import os
import sys
import time
import uuid
from concurrent.futures import ProcessPoolExecutor, as_completed


BUCKET = "synth_p2_canary_concurrency_gate"


def _worker(database_url: str, bucket_key: str, worker_id: int) -> dict:
    """One reservation attempt in an isolated process/session."""
    # Late imports so each process gets a fresh engine.
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.services import pilot_hard_caps as caps

    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True, pool_size=1, max_overflow=0)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        ok, reason = caps.try_reserve(db, bucket_key=bucket_key, n=1)
        return {
            "worker_id": worker_id,
            "ok": bool(ok),
            "reason": reason,
            "pid": os.getpid(),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "worker_id": worker_id,
            "ok": False,
            "reason": f"exception:{type(exc).__name__}",
            "pid": os.getpid(),
        }
    finally:
        db.close()
        engine.dispose()


def _prepare_bucket(database_url: str, bucket_key: str) -> None:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.services import pilot_hard_caps as caps

    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        caps.ensure_isolated_synth_bucket(
            db,
            bucket_key=bucket_key,
            absolute_max=1,
            effective_limit=1,
            reset_used=True,
        )
    finally:
        db.close()
        engine.dispose()


def _read_used(database_url: str, bucket_key: str) -> int:
    from sqlalchemy import create_engine, text

    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT used_count FROM pilot_cap_buckets WHERE bucket_key = :k"),
            {"k": bucket_key},
        ).fetchone()
    engine.dispose()
    return int(row[0]) if row else -1


def _cleanup_bucket(database_url: str, bucket_key: str) -> None:
    from sqlalchemy import create_engine, text

    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        # Reset used; keep row for redeploy-safe observability (kpi_excluded synth).
        conn.execute(
            text(
                "UPDATE pilot_cap_buckets SET used_count = 0, effective_limit = 0, "
                "updated_at = NOW() WHERE bucket_key = :k"
            ),
            {"k": bucket_key},
        )
    engine.dispose()


def run_proof(*, database_url: str, workers: int = 12) -> dict:
    run_id = uuid.uuid4().hex[:10]
    bucket_key = f"{BUCKET}_{run_id}"
    _prepare_bucket(database_url, bucket_key)

    # Multi-process concurrent reservations
    results: list[dict] = []
    t0 = time.time()
    ctx = mp.get_context("spawn")
    with ProcessPoolExecutor(max_workers=workers, mp_context=ctx) as pool:
        futs = [
            pool.submit(_worker, database_url, bucket_key, i) for i in range(workers)
        ]
        for fut in as_completed(futs):
            results.append(fut.result())
    elapsed = time.time() - t0

    successes = [r for r in results if r.get("ok")]
    rejects = [r for r in results if not r.get("ok")]
    used = _read_used(database_url, bucket_key)
    overshoot = max(0, used - 1)

    # Idempotency / release / re-reserve after release
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.services import pilot_hard_caps as caps

    url = database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        # Cap full — second reserve must fail
        ok_full, reason_full = caps.try_reserve(db, bucket_key=bucket_key, n=1)
        caps.release_reservation(db, bucket_key=bucket_key, n=1)
        ok_after, reason_after = caps.try_reserve(db, bucket_key=bucket_key, n=1)
        # expire semantics: set effective_limit=0 and prove reject
        row = caps.ensure_isolated_synth_bucket(
            db,
            bucket_key=bucket_key,
            absolute_max=1,
            effective_limit=0,
            reset_used=True,
        )
        _ = row
        ok_expired, reason_expired = caps.try_reserve(db, bucket_key=bucket_key, n=1)
    finally:
        db.close()
        engine.dispose()

    _cleanup_bucket(database_url, bucket_key)

    passed = (
        len(successes) == 1
        and len(rejects) == workers - 1
        and used == 1
        and overshoot == 0
        and ok_full is False
        and reason_full == "cap_exceeded"
        and ok_after is True
        and ok_expired is False
    )
    return {
        "schema": "twin.pilot_gate_p2_pg_concurrency/v1",
        "bucket_key_prefix": BUCKET,
        "run_id": run_id,
        "workers": workers,
        "elapsed_sec": round(elapsed, 3),
        "successful_reservations": len(successes),
        "rejected_excess_reservations": len(rejects),
        "cap_overshoot": overshoot,
        "final_used_count_at_peak": used,
        "post_full_reject": reason_full,
        "post_release_reserve_ok": ok_after,
        "post_expire_reject": reason_expired,
        "reject_reasons": sorted({r.get("reason") for r in rejects}),
        "worker_pids_unique": len({r.get("pid") for r in results}),
        "passed": passed,
        "kpi_excluded": True,
        "mutates_real_invites": False,
        "claim_kind": "FACT",
    }


def main() -> int:
    # Prefer public URL for local runner; never print credentials.
    database_url = (os.environ.get("DATABASE_PUBLIC_URL") or os.environ.get("DATABASE_URL") or "").strip()
    if not database_url:
        # Load from Railway twin service without printing secrets.
        import subprocess

        raw = subprocess.check_output(
            ["npx", "--yes", "@railway/cli@4", "variables", "--service", "twin", "--json"],
            text=True,
        )
        flat = json.loads(raw).get("variables", json.loads(raw))
        database_url = (flat.get("DATABASE_PUBLIC_URL") or flat.get("DATABASE_URL") or "").strip()
    if not database_url or "railway.internal" in database_url:
        print("FAIL no_reachable_postgres_url")
        return 2
    if "postgresql" not in database_url:
        print("FAIL not_postgres")
        return 2

    # Ensure backend import path
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    if root not in sys.path:
        sys.path.insert(0, root)

    out = run_proof(database_url=database_url, workers=int(os.environ.get("P2_CAP_WORKERS", "12")))
    print(json.dumps(out, sort_keys=True))
    print("PASS" if out["passed"] else "FAIL", "pg_concurrency_cap1")
    return 0 if out["passed"] else 1


if __name__ == "__main__":
    # Required for spawn on macOS
    mp.set_start_method("spawn", force=True)
    raise SystemExit(main())
