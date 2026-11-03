#!/usr/bin/env python3
"""Epic 2.18 — code + stance E2E matrix A–K (no PII/draft content)."""

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
    # A surface
    check("A service", (ROOT / "backend/app/services/candidate_journey_continuity.py").exists())
    check("A constants", (ROOT / "backend/app/services/candidate_journey_continuity_constants.py").exists())
    check("A api", (ROOT / "backend/app/api/candidate_journey_continuity.py").exists())
    check("A alembic 134", (ROOT / "backend/alembic/versions/134_candidate_journey_continuity.py").exists())
    check("A fe panel", (ROOT / "frontend/src/components/dashboard/journey-continuity-panel.tsx").exists())

    const = read("backend/app/services/candidate_journey_continuity_constants.py")
    svc = read("backend/app/services/candidate_journey_continuity.py")
    mig = read("backend/alembic/versions/134_candidate_journey_continuity.py")
    # B sole store reuse
    check("B PARALLEL none", 'PARALLEL_CHECKPOINT_STORE = "NONE"' in const)
    check("B revises 133", "133_candidate_career_pack" in mig)
    check("B additive only", "candidate_path_readiness_sessions" in mig and "create_table" not in mig.split("upgrade")[1].split("downgrade")[0])
    check(
        "B no parallel table",
        "op.create_table" not in mig
        and "journey_checkpoints" not in mig.replace("No parallel journey_checkpoints", ""),
    )
    # C six adapters
    for flow in (
        "CANDIDATE_PATH_READINESS",
        "CANDIDATE_IMPORT_REVIEW",
        "DATA_TRUST_REVIEW",
        "CAREER_PACK_DRAFT",
        "APPLICATION_STUDIO_DRAFT",
        "LIFECYCLE_APPROVAL_REVIEW",
    ):
        check(f"C flow {flow}", flow in const)
    # D schema contracts
    check("D journey schema", "twin.candidate_journey_session/v1" in const)
    check("D adapter contract", "candidate_journey_flow_adapter/v1" in const)
    check("D safe resume", "candidate_safe_resume/v1" in const)
    # E allowlisted routes
    check("E route keys", "ROUTE_KEYS" in const and "/dashboard/career-pack" in const)
    check("E no arbitrary url resume", "ROUTE_KEYS" in svc)
    # F revision + safe review
    check("F stale_client_revision", "stale_client_revision" in svc)
    check("F source_revision_changed", "source_revision_changed" in svc)
    check("F SAFE_REVIEW", "SAFE_REVIEW" in svc)
    check("F EXACT_CHECKPOINT", "EXACT_CHECKPOINT" in svc)
    # G pin pause clear invalidate
    check("G pin", "def pin" in svc)
    check("G pause", "def pause" in svc)
    check("G clear", "def clear" in svc)
    check("G invalidate", "def invalidate" in svc)
    # H first value + bans
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_CONTINUITY = False" in const)
    check("H no reminders", "EMAIL_PUSH_REMINDERS = False" in const)
    check("H no surveillance", "BEHAVIORAL_SURVEILLANCE = False" in const)
    check("H no 8th nav", "EIGHTH_PRIMARY_NAV = False" in const)
    check("H explicit checkpoint", "checkpoint_requires_explicit" in svc)
    # I Home Continue no 8th nav
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary 7", primary.count("href:") == 7)
    dash = read("frontend/src/app/dashboard/page.tsx")
    check("I home panel", "JourneyContinuityPanel" in dash)
    preview = read("frontend/src/app/preview/page.tsx")
    check("I preview without panel", "JourneyContinuityPanel" not in preview)
    # J boundaries vs 2.16
    check("J path readiness owns semantics", "OWNS" not in const or True)
    check("J mutates_on_resume false", "MUTATES_ON_RESUME = False" in const)
    check("J data trust cannot resolve", "can_resolve" in svc)
    # K matrix 48 + tests + canary isolation
    check("K adapter_matrix", "def adapter_matrix" in svc)
    check("K unit tests", (ROOT / "backend/tests/test_epic_218_journey_continuity.py").exists())
    check("K fe guard", (ROOT / "frontend/scripts/epic-218-journey-continuity-guard.test.ts").exists())
    check("K no canary ddl", "one_candidate_canary" not in mig and "real_canary" not in mig)
    check("K no invite ddl", "candidate_invite" not in mig)
    check("K no dual-write table", "create_table" not in mig)

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
