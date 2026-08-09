#!/usr/bin/env python3
"""Epic 2.22 — PostgreSQL refresh rotation concurrency proof.

Requires DATABASE_URL pointing at Postgres. SQLite is insufficient (no real FOR UPDATE).
Runs two concurrent rotate attempts on the same refresh digest; exactly one succeeds.
"""

from __future__ import annotations

import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure backend import path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


def main() -> int:
    url = (os.environ.get("DATABASE_URL") or os.environ.get("TWIN_DATABASE_URL") or "").strip()
    if not url or "sqlite" in url.lower():
        print("SKIP postgres_concurrency — set DATABASE_URL to PostgreSQL")
        return 0
    if "postgresql" not in url and "postgres" not in url:
        print("SKIP postgres_concurrency — DATABASE_URL is not postgres")
        return 0

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database.models import Base, CandidateAuthSession, CandidateRefreshTokenFamily, User
    from app.services import candidate_auth_session as cas

    engine = create_engine(url, pool_pre_ping=True)
    Base.metadata.create_all(
        bind=engine,
        tables=[
            User.__table__,
            CandidateAuthSession.__table__,
            CandidateRefreshTokenFamily.__table__,
        ],
        checkfirst=True,
    )
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        email = "epic222-concurrency+kpi@twin.internal"
        u = db.query(User).filter(User.email == email).one_or_none()
        if u is None:
            from datetime import datetime

            from app.core.security import hash_password

            u = User(
                email=email,
                hashed_password=hash_password("synth-not-login"),
                gdpr_consent_at=datetime.utcnow(),
                exclude_from_product_metrics=True,
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        issued = cas.issue_session(db, user=u, expires_minutes=30, kpi_excluded=True)
        refresh = issued["refresh_token"]
        assert refresh
    finally:
        db.close()

    lock = threading.Lock()
    results: list[str] = []

    def attempt() -> str:
        s = SessionLocal()
        try:
            cas.rotate_refresh(s, refresh_token=refresh)
            return "ok"
        except Exception as exc:
            return f"err:{type(exc).__name__}:{exc}"
        finally:
            s.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futs = [pool.submit(attempt), pool.submit(attempt)]
        for f in as_completed(futs):
            with lock:
                results.append(f.result())

    oks = [r for r in results if r == "ok"]
    print({"results": results, "success_count": len(oks)})
    if len(oks) != 1:
        print("FAIL expected exactly one successful rotation under contention")
        return 1
    print("PASS postgres_refresh_concurrency")
    return 0


if __name__ == "__main__":
    sys.exit(main())
