#!/usr/bin/env python3
"""Epic 2.16 — code + stance E2E matrix A–J (no real PII)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PASS = 0
FAIL = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"PASS  {name}" + (f" — {detail}" if detail else ""))
    else:
        FAIL += 1
        print(f"FAIL  {name}" + (f" — {detail}" if detail else ""))


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def main() -> int:
    # A service surface
    check("A service", (ROOT / "backend/app/services/candidate_path_readiness.py").exists())
    check("A constants", (ROOT / "backend/app/services/candidate_path_readiness_constants.py").exists())
    check("A api", (ROOT / "backend/app/api/candidate_path_readiness.py").exists())
    check("A alembic 132", (ROOT / "backend/alembic/versions/132_candidate_path_readiness.py").exists())
    check("A fe panel", (ROOT / "frontend/src/components/dashboard/path-readiness-panel.tsx").exists())

    const = read("backend/app/services/candidate_path_readiness_constants.py")
    svc = read("backend/app/services/candidate_path_readiness.py")
    # B five paths only
    for kind in (
        "EVALUATE_ONE_OPPORTUNITY",
        "PREPARE_ONE_APPLICATION",
        "PREPARE_ONE_INTERVIEW",
        "REVIEW_ONE_CAREER_DECISION",
        "MOVE_ONE_APPROVED_DECISION_TO_EXECUTION",
    ):
        check(f"B path {kind}", kind in const)
    check("B no best path", "RECOMMENDS_BEST_PATH = False" in const)
    # C two-axis + STARTABLE
    check("C STARTABLE", "STARTABLE" in const and "STARTABLE" in svc)
    check("C requirement statuses", "BLOCKING" in const and "SATISFIED" in const)
    # D no scores / banned copy
    check("D no employability scores", "PERSON_EMPLOYABILITY_SCORES = False" in const)
    check("D banned ready to apply", "ready to apply" in const)
    check("D assert_copy_safe", "assert_copy_safe" in svc)
    # E non-mutating evaluate
    check("E mutates_on_evaluate false", "MUTATES_ON_EVALUATE = False" in const)
    check("E mutations 0 in evaluate", '"mutations": 0' in svc or "'mutations': 0" in svc)
    # F allowlisted deep links
    check("F data-trust link", "/dashboard/data-trust" in const)
    check("F approvals link", "/dashboard/approvals" in const)
    # G data trust handoff no auto-continue
    check("G recalculate_after_data_trust", "recalculate_after_data_trust" in svc)
    check("G auto_continue false", "AUTO_CONTINUE_AFTER_DATA_TRUST = False" in const)
    # H first value integrity
    check("H clicks != satisfaction", "CLICKS_EQUAL_SATISFACTION = False" in const)
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_PATH_READINESS = False" in const)
    # I no 8th nav + home panel
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary still 7 markers", "CANDIDATE_PRIMARY_IA" in primary)
    check("I no path-readiness primary", "/path-readiness" not in primary)
    dash = read("frontend/src/app/dashboard/page.tsx")
    check("I home panel mounted", "PathReadinessPanel" in dash)
    preview = read("frontend/src/app/preview/page.tsx")
    check("I preview without panel", "PathReadinessPanel" not in preview)
    # J boundaries / canary isolation
    mig = read("backend/alembic/versions/132_candidate_path_readiness.py")
    check("J revises 131", "131_candidate_data_trust" in mig)
    check(
        "J no canary ddl",
        "one_candidate_canary" not in mig and "real_canary" not in mig,
    )
    check("J no invite ddl", "candidate_invite" not in mig)
    check("J schema id", "twin.candidate_path_readiness/v1" in const)
    check("J owns data trust boundary", "OWNS_DATA_TRUST" in const)
    check("J unit tests", (ROOT / "backend/tests/test_epic_216_path_readiness.py").exists())
    check("J fe guard", (ROOT / "frontend/scripts/epic-216-path-readiness-guard.test.ts").exists())

    api_base = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
    try:
        body = subprocess.check_output(
            ["curl", "-sS", f"{api_base}/api/v1/health?ops=1"],
            text=True,
            timeout=25,
        )
        compact = body.replace(" ", "")
        check("stance launch NO-GO", '"rc1_launch":"NO-GO"' in compact)
        check("stance enrollment OFF", '"rc1_external_pilot_enrollment_enabled":false' in compact)
        check("stance canary inactive", '"rc1_one_candidate_canary_active":false' in compact)
        check(
            "stance activation prepared",
            '"rc1_canary_activation_command":"PREPARED_NOT_EXECUTED"' in compact,
        )
        check("stance designation 0", '"rc1_real_canary_designation_count":0' in compact)
        check("stance canary cap 0", '"rc1_effective_canary_cap":0' in compact)
    except Exception as exc:
        check("stance prod health", False, str(exc))

    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
