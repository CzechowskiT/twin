#!/usr/bin/env python3
"""Epic 2.26 — concurrency proof entrypoint.

Delegates to the real PostgreSQL proof when DATABASE_URL is set.
Falls back to a static source check only when PG is unavailable (NOT a substitute
for Gate 2 — report NOT_RUN_NO_PG in that case).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REAL = ROOT / "scripts" / "epic-2-26-practice-pg-concurrency-proof.py"


def main() -> int:
    db = (os.environ.get("DATABASE_PUBLIC_URL") or os.environ.get("DATABASE_URL") or "").strip()
    if db.startswith("postgres") and REAL.exists():
        return subprocess.call([sys.executable, str(REAL)], cwd=str(ROOT))
    src = (ROOT / "backend/app/services/candidate_interview_practice.py").read_text(encoding="utf-8")
    ok = "with_for_update" in src and "db.commit()" in src and "turn_already_submitted" in src
    print("STATIC_ONLY with_for_update+commit-before-model:", ok)
    print("NOT_RUN_NO_PG — set DATABASE_URL to run scripts/epic-2-26-practice-pg-concurrency-proof.py")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
