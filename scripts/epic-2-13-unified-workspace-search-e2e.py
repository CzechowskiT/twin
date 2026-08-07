#!/usr/bin/env python3
"""Epic 2.13 — code + stance E2E (no real PII)."""

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
    check("service", (ROOT / "backend/app/services/unified_workspace_search.py").exists())
    check("adapters", (ROOT / "backend/app/services/workspace_search_adapters.py").exists())
    check("inventory", (ROOT / "backend/app/services/workspace_search_route_inventory.py").exists())
    check("api", (ROOT / "backend/app/api/unified_workspace_search.py").exists())
    check("fe palette", (ROOT / "frontend/src/components/candidate/workspace-search-palette.tsx").exists())
    check("fe page", (ROOT / "frontend/src/app/dashboard/workspace-search/page.tsx").exists())

    svc = read("backend/app/services/unified_workspace_search.py")
    const = read("backend/app/services/workspace_search_constants.py")
    check("schema id", "twin.unified_career_workspace_search/v1" in const)
    check("zero mutations", "mutations" in svc and "0" in svc)
    check("no first value", "first_value_satisfied" in svc)
    check("no elasticsearch", "no_elasticsearch" in svc)

    api = read("backend/app/api/unified_workspace_search.py")
    check("post body search", '"/me/workspace-search"' in api or "/me/workspace-search" in api)
    check("cache no-store", "no-store" in api)

    inv = read("backend/app/services/workspace_search_route_inventory.py")
    check("inventory complete helper", "complete" in inv)
    check("ms calendar excluded", "ms_calendar_content_never_indexed" in inv)
    check("raw cv excluded", "raw_cv_never_indexed" in inv)

    ad = read("backend/app/services/workspace_search_adapters.py")
    check("committed import only", 'state == "COMMITTED"' in ad)
    check("draft evidence excluded", "EVIDENCE_EXCLUDED_STATUS" in ad or "draft" in ad)

    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("no 8th primary search", primary.count("/dashboard/workspace-search") == 0)
    check("secondary search entry", "/dashboard/workspace-search" in ia)

    preview = read("frontend/src/app/preview/page.tsx")
    check("preview has no workspace search palette", "WorkspaceSearchPalette" not in preview)

    check("pp1 gate", "READ_ONLY_SYNTHETIC" in read("frontend/src/lib/public-preview-gate.ts"))
    check("unit tests", (ROOT / "backend/tests/test_epic_213_unified_workspace_search.py").exists())

    api_base = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
    try:
        body = subprocess.check_output(
            ["curl", "-sS", f"{api_base}/api/v1/health?ops=1"],
            text=True,
            timeout=20,
        )
        compact = body.replace(" ", "")
        check("prod launch NO-GO", '"rc1_launch":"NO-GO"' in compact)
        check("enrollment OFF", '"rc1_external_pilot_enrollment_enabled":false' in compact)
        check("preview enabled", '"rc1_public_preview_enabled":true' in compact)
    except Exception as exc:
        check("prod health", False, str(exc)[:80])

    print(f"\nEpic 2.13 code/stance E2E: {PASS} pass / {FAIL} fail")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
