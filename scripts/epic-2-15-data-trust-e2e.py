#!/usr/bin/env python3
"""Epic 2.15 — code + stance E2E (no real PII; canary isolation)."""

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
    check("service", (ROOT / "backend/app/services/candidate_data_trust.py").exists())
    check("constants", (ROOT / "backend/app/services/candidate_data_trust_constants.py").exists())
    check("api", (ROOT / "backend/app/api/candidate_data_trust.py").exists())
    check("alembic 131", (ROOT / "backend/alembic/versions/131_candidate_data_trust.py").exists())
    check("fe workspace", (ROOT / "frontend/src/components/candidate/data-trust-workspace.tsx").exists())
    check("fe page", (ROOT / "frontend/src/app/dashboard/data-trust/page.tsx").exists())

    const = read("backend/app/services/candidate_data_trust_constants.py")
    svc = read("backend/app/services/candidate_data_trust.py")
    check("schema id", "twin.candidate_data_trust/v1" in const)
    check("no auto repair", "AUTO_REPAIR = False" in const)
    check("no fuzzy llm", "FUZZY_OR_LLM_CONFLICT = False" in const)
    check("no trust scores", "TRUST_QUALITY_SCORES = False" in const)
    check("not first value", "FIRST_VALUE_SATISFIED_BY_DATA_TRUST = False" in const)
    check("post commit spawn", "spawn_post_commit_review" in svc)
    check("impact preview", "mutates_on_preview" in svc)
    check("conflict-safe undo", "undo_conflict" in svc or "undo_conflict_skills_edited" in svc)
    check("stale dependents", "_mark_stale_dependents" in svc)
    check("approval kind", "data_trust_change_set" in const)

    mig = read("backend/alembic/versions/131_candidate_data_trust.py")
    check("revises 130", "130_real_canary_candidate_designation" in mig)
    check(
        "no canary table touch",
        "create_table(\n            \"one_candidate_canary" not in mig
        and "create_table(\n            \"real_canary" not in mig
        and "op.drop_table(\"one_candidate_canary" not in mig,
    )
    check(
        "no invite table touch",
        "candidate_invite" not in mig and "invite_tokens" not in mig,
    )

    api = read("backend/app/api/candidate_data_trust.py")
    check("catalog route", "/me/data-trust/catalog" in api)
    check("cache no-store", "no-store" in api)

    coi = read("backend/app/services/candidate_owned_import.py")
    check("import hooks post-commit", "spawn_post_commit_review" in coi)

    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("no 8th primary data-trust", primary.count("/dashboard/data-trust") == 0)
    check("secondary data-trust", "/dashboard/data-trust" in ia)
    check("primary still 7", "CANDIDATE_PRIMARY_IA" in ia)

    preview = read("frontend/src/app/preview/page.tsx")
    check("preview has no data trust workspace", "DataTrustWorkspace" not in preview)

    privacy = read("frontend/src/app/dashboard/privacy-center/page.tsx")
    check("settings link to data-trust", "data-trust" in privacy)

    check("unit tests", (ROOT / "backend/tests/test_epic_215_candidate_data_trust.py").exists())
    check("fe guard", (ROOT / "frontend/scripts/epic-215-data-trust-guard.test.ts").exists())

    # Canary isolation — product code must not mutate canary control
    check("svc no canary ddl", "one_candidate_canary" not in svc)
    check("svc no designation", "RealCanaryCandidateDesignation" not in svc)
    check("svc no invite mint", "create_invite" not in svc)

    api_base = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
    try:
        body = subprocess.check_output(
            ["curl", "-sS", f"{api_base}/api/v1/health?ops=1"],
            text=True,
            timeout=25,
        )
        compact = body.replace(" ", "")
        check("prod launch NO-GO", '"rc1_launch":"NO-GO"' in compact)
        check("enrollment OFF", '"rc1_external_pilot_enrollment_enabled":false' in compact)
        check("preview enabled", '"rc1_public_preview_enabled":true' in compact)
        check("canary not active", '"rc1_one_candidate_canary_active":false' in compact)
        check(
            "activation prepared",
            '"rc1_canary_activation_command":"PREPARED_NOT_EXECUTED"' in compact,
        )
        check("designation count 0", '"rc1_real_canary_designation_count":0' in compact)
        check("canary cap 0", '"rc1_effective_canary_cap":0' in compact)
    except Exception as exc:
        check("prod health stance", False, str(exc))

    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
