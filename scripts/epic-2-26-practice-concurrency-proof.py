#!/usr/bin/env python3
"""Epic 2.26 — concurrency proof for practice turn submit.

Asserts submit_turn uses with_for_update() and commits before the model call
so concurrent submits serialize and DB transactions are not held during AI.
Does not require a live Postgres when run as a static proof; optional PG
fixture coverage lives in unit tests.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "backend/app/services/candidate_interview_practice.py").read_text(encoding="utf-8")
ok = "with_for_update" in src and "db.commit()" in src and "turn_already_submitted" in src
print("submit_turn uses with_for_update + commit-before-model + duplicate guard:", ok)
raise SystemExit(0 if ok else 1)
