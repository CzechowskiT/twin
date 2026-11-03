#!/usr/bin/env python3
"""Epic 2.14 — code + stance E2E (no real invite / no activation)."""

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
    check("svc_private_canary", (ROOT / "backend/app/services/private_canary.py").exists())
    check("svc_ladder", (ROOT / "backend/app/services/first_value_ladder.py").exists())
    check("svc_journey", (ROOT / "backend/app/services/canary_journey.py").exists())
    check("api", (ROOT / "backend/app/api/private_canary.py").exists())
    check("alembic_129", (ROOT / "backend/alembic/versions/129_private_canary_activation_readiness.py").exists())
    check("fe_panel", (ROOT / "frontend/src/components/dashboard/canary-first-value-panel.tsx").exists())
    check("fe_admin", (ROOT / "frontend/src/app/admin/canary/page.tsx").exists())
    check("fe_bff", (ROOT / "frontend/src/app/api/ops-admin/canary/control/route.ts").exists())
    check("unit_tests", (ROOT / "backend/tests/test_epic_214_private_canary.py").exists())

    svc = read("backend/app/services/private_canary.py")
    check("never_auto_active", "ACTIVE_ONE_CANDIDATE" in svc and "never" in svc.lower())
    check("dry_run_only", "create_invite_dry_run" in svc)
    check("prepared_not_executed", "PREPARED_NOT_EXECUTED" in svc)
    check("no_execute_in_epic", "never set by this epic" in svc.lower() or "ACTIVATION_EXECUTED" in svc)

    ladder = read("backend/app/services/first_value_ladder.py")
    check("ladder_states", all(x in ladder for x in ("READY", "VIEWED", "ACKNOWLEDGED", "ACTIONED")))
    check("not_route_visit", "route_visit_alone" in ladder)
    check("synthetic_lane", "SYNTHETIC" in ladder and "REAL" in ladder)

    journey = read("backend/app/services/canary_journey.py")
    check("primary_ia_7", "primary_ia_count\": 7" in journey.replace(" ", "") or "primary_ia_count\":7" in journey.replace(" ", "") or '"primary_ia_count": 7' in journey)
    check("eighth_false", "eighth_nav_item" in journey)
    check("friction_no_query", "query_logged" in journey)

    invite = read("backend/app/services/candidate_invite_tokens.py")
    check("redeem_fail_closed", "assert_redeem_allowed" in invite)

    health = read("backend/app/services/health_ops.py")
    check("health_canary_flags", "rc1_one_candidate_canary_ready" in health)
    check("health_activation_cmd", "rc1_canary_activation_command" in health)

    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("no_8th_primary", primary.count("/dashboard/workspace-search") == 0)
    check("secondary_search", "/dashboard/workspace-search" in ia)

    dash = read("frontend/src/app/dashboard/page.tsx")
    check("panel_mounted", "CanaryFirstValuePanel" in dash)

    preview = read("frontend/src/app/preview/page.tsx")
    check("preview_no_canary_panel", "CanaryFirstValuePanel" not in preview)

    check("pp1_gate", "READ_ONLY_SYNTHETIC" in read("frontend/src/lib/public-preview-gate.ts"))

    api_base = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
    try:
        body = subprocess.check_output(
            ["curl", "-sS", f"{api_base}/api/v1/health?ops=1"],
            text=True,
            timeout=20,
        )
        compact = body.replace(" ", "")
        check("prod_launch_nogo", '"rc1_launch":"NO-GO"' in compact)
        check("enrollment_off", '"rc1_external_pilot_enrollment_enabled":false' in compact)
        check("preview_on", '"rc1_public_preview_enabled":true' in compact)
    except Exception as exc:
        check("prod_health", False, str(exc)[:80])

    print(f"\nEpic 2.14 code/stance E2E: {PASS} pass / {FAIL} fail")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
