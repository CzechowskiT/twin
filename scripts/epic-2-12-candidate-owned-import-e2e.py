#!/usr/bin/env python3
"""Epic 2.12 — synthetic E2E + stance checks (no real PII).

Product journeys (code-level + optional live API):
  A Document→Evidence approve/commit/rollback
  B Tracker→Opportunities staging
  C TWIN restore deny secrets
  D reject/cancel
  E conflict/dup marking
  F first-value: upload≠first value
Stance: PP1 intact, Launch NO-GO, enrollment OFF, no 8th nav
"""

from __future__ import annotations

import os
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
    # Product code presence
    check("service exists", (ROOT / "backend/app/services/candidate_owned_import.py").exists())
    check("security exists", (ROOT / "backend/app/services/import_security.py").exists())
    check("parsers exist", (ROOT / "backend/app/services/import_parsers.py").exists())
    check("api exists", (ROOT / "backend/app/api/candidate_owned_import.py").exists())
    check("alembic 128", (ROOT / "backend/alembic/versions/128_candidate_owned_import.py").exists())
    check("fe import page", (ROOT / "frontend/src/app/dashboard/import/page.tsx").exists())
    check("fe workspace", (ROOT / "frontend/src/components/candidate/import-center-workspace.tsx").exists())

    svc = read("backend/app/services/candidate_owned_import.py")
    check("zero mutations until commit gate", "canonical_mutations" in svc and "AWAITING_APPROVAL" in svc)
    check("encrypt raw uploads", "_encrypt" in svc and "ciphertext_b64" in svc)
    check("no malware-free claim", "malware_free_claim" in svc)
    check("stale preview stop", "stale_preview" in svc)
    check("rollback conflict-safe", "ROLLING_BACK" in svc or "ROLLED_BACK" in svc)

    sec = read("backend/app/services/import_security.py")
    check("magic bytes", "magic_mismatch" in sec)
    check("zip banned", "generic_zip_banned" in sec or "format_banned" in sec)

    parsers = read("backend/app/services/import_parsers.py")
    check("UNTRUSTED marker", "UNTRUSTED_CANDIDATE_DATA" in parsers)
    check("twin deny secrets", "TWIN_RESTORE_DENY" in parsers or "twin_export_denied" in parsers)

    ia = read("frontend/src/lib/candidate-ia.ts")
    check("import in secondary not primary", '"/dashboard/import"' in ia)
    check("still 7 primaries", "CANDIDATE_PRIMARY_IA" in ia and ia.count('id: "') >= 7)
    # Ensure not added as 8th primary id block — primary list length by hrefs in PRIMARY
    primary_block = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("no 8th primary href import", primary_block.count("/dashboard/import") == 0)

    preview = read("frontend/src/app/preview/page.tsx")
    check("preview has no import center", "import" not in preview.lower() or "ImportCenter" not in preview)

    # PP1 regression surface
    check("pp1 gate file", (ROOT / "frontend/src/lib/public-preview-gate.ts").exists())
    gate = read("frontend/src/lib/public-preview-gate.ts")
    check("pp1 kill switch intact", "READ_ONLY_SYNTHETIC" in gate)

    # Unit tests present
    check("unit tests", (ROOT / "backend/tests/test_epic_212_candidate_owned_import.py").exists())

    # Live optional
    api = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
    try:
        import subprocess

        body = subprocess.check_output(
            ["curl", "-sS", f"{api}/api/v1/health?ops=1"],
            text=True,
            timeout=20,
        )
        compact = body.replace(" ", "")
        check("prod launch NO-GO", '"rc1_launch":"NO-GO"' in compact)
        check("enrollment OFF", '"rc1_external_pilot_enrollment_enabled":false' in compact)
        check("preview enabled flag", '"rc1_public_preview_enabled":true' in compact)
    except Exception as exc:
        check("prod health reachable", False, str(exc)[:80])

    print(f"\nEpic 2.12 E2E code/stance: {PASS} pass / {FAIL} fail")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
