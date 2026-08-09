#!/usr/bin/env python3
"""Epic 2.21 — code + stance E2E matrix A–K."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PASS = FAIL = 0


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
    check("A constants", (ROOT / "backend/app/services/candidate_workspace_handoff_constants.py").exists())
    check("A service", (ROOT / "backend/app/services/candidate_workspace_handoff.py").exists())
    check("A api", (ROOT / "backend/app/api/candidate_workspace_handoff.py").exists())
    check("A banner", (ROOT / "frontend/src/components/candidate/workspace-handoff-banner.tsx").exists())
    check("A audit", (ROOT / "reports/epic-2-21-workspace-handoffs-2026-08-09/owner-audit.md").exists())

    const = read("backend/app/services/candidate_workspace_handoff_constants.py")
    svc = read("backend/app/services/candidate_workspace_handoff.py")
    api = read("backend/app/api/candidate_workspace_handoff.py")
    check("B parallel handoff NONE", 'PARALLEL_HANDOFF_OR_CHECKPOINT_STORE = "NONE"' in const)
    check("B no alembic 136", not (ROOT / "backend/alembic/versions/136_candidate_handoff.py").exists())
    check("B registry schema", "twin.candidate_handoff_registry/v1" in const)
    check("B context schema", "twin.candidate_handoff_context/v1" in const)
    for hid in (
        "import_to_data_trust",
        "data_trust_to_path_home",
        "opportunity_to_app_studio",
        "app_studio_to_career_pack",
        "career_pack_to_access_center",
    ):
        check(f"C handoff {hid}", hid in const)
    check("D max depth 3", "MAX_DEPTH = 3" in const)
    check("D ttl 30m", "DEFAULT_TTL_SECONDS = 30 * 60" in const)
    check("E encrypt envelope", "encrypt_secret" in svc)
    check("E no mutations flag", "MUTATIONS_AT_HANDOFF_LAYER = False" in const)
    check("F resolve route", "/me/workspace-handoffs/resolve" in api)
    check("F create route", '"/me/workspace-handoffs"' in api or "/me/workspace-handoffs\"" in api)
    check("G ownership recheck", "_verify_object" in svc)
    check("G continuity prefer", "_continuity_hint" in svc)
    check("H no next best", "NEXT_BEST_ACTION = False" in const)
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_HANDOFF = False" in const)
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary 7", primary.count("href:") == 7)
    dash = read("frontend/src/app/dashboard/page.tsx")
    check("I continuity panel", "JourneyContinuityPanel" in dash)
    check("J strip handle", "replaceState" in read("frontend/src/components/candidate/workspace-handoff-banner.tsx"))
    check("J referrer no-store", "no-referrer" in api and "no-store" in api)

    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_epic_221_workspace_handoff.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("K unit", r.returncode == 0, (r.stdout + r.stderr)[-240:])
    r2 = subprocess.run(
        ["npm", "run", "test:epic-221-workspace-handoff-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("K fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-200:])

    try:
        import json
        import ssl
        import urllib.request

        try:
            import certifi

            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            ctx = ssl.create_default_context()
        fe = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
        with urllib.request.urlopen(f"{fe}/api/public-health", timeout=45, context=ctx) as resp:
            ph = json.loads(resp.read().decode())
        check("stance launch NO-GO", ph.get("rc1_launch") == "NO-GO")
        check("stance enrollment OFF", ph.get("rc1_external_pilot_enrollment_enabled") is False)
        check("stance canary inactive", ph.get("rc1_one_candidate_canary_active") is False)
        check(
            "stance activation prepared",
            ph.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
        )
        check("stance designation 0", int(ph.get("rc1_real_canary_designation_count") or 0) == 0)
        check("stance canary cap 0", int(ph.get("rc1_effective_canary_cap") or 0) == 0)
    except Exception as exc:
        check("stance public health", False, str(exc)[:120])

    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
