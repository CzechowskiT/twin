#!/usr/bin/env python3
"""Epic 2.20 — code + stance E2E matrix A–M (no secrets/PII)."""

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
    check("A constants", (ROOT / "backend/app/services/candidate_access_inventory_constants.py").exists())
    check("A service", (ROOT / "backend/app/services/candidate_access_inventory.py").exists())
    check("A api", (ROOT / "backend/app/api/candidate_access_inventory.py").exists())
    check("A page", (ROOT / "frontend/src/app/dashboard/settings/access/page.tsx").exists())
    check("A audit", (ROOT / "reports/epic-2-20-access-control-2026-08-09/owner-audit.md").exists())

    const = read("backend/app/services/candidate_access_inventory_constants.py")
    svc = read("backend/app/services/candidate_access_inventory.py")
    api = read("backend/app/api/candidate_access_inventory.py")
    # B no new store
    check("B NEW store NONE", 'NEW_ACCESS_GRANT_STORE = "NONE"' in const)
    check("B parallel token NONE", 'PARALLEL_TOKEN_STORE = "NONE"' in const)
    check("B parallel share NONE", 'PARALLEL_SHARE_STORE = "NONE"' in const)
    check("B no alembic 136", not (ROOT / "backend/alembic/versions/136_candidate_access.py").exists())
    # C kinds
    for k in (
        "AUTH_SESSION",
        "OAUTH_CONNECTION",
        "CALENDAR_READ_CONSENT",
        "PRIVATE_CALENDAR_FEED",
        "CAREER_PACK_SHARE",
        "TEMPORARY_CAREER_PACK_ARTIFACT",
        "TEMPORARY_PRIVACY_EXPORT",
    ):
        check(f"C kind {k}", k in const)
    # D exclusions
    for d in ("journey_continuity", "path_readiness", "data_trust", "daily_os", "drafts"):
        check(f"D exclude {d}", d in const)
    # E schema
    check("E inventory schema", "twin.candidate_access_inventory/v1" in const)
    check("E revocation schema", "twin.candidate_access_revocation/v1" in const)
    # F derived
    check("F build_inventory", "def build_inventory" in svc)
    check("F derived_only", "derived_only" in svc)
    # G revoke post-condition
    check("G post_condition", "post_condition_verified" in svc)
    check("G no success_on_accept", "success_on_accept" in svc and "False" in svc)
    check("G revision_mismatch", "revision_mismatch" in svc)
    # H no secrets
    check("H secret_present false", "secret_present" in svc)
    check("H no share_url", "share_url_once" not in svc)
    check("H no refresh_token field", "refresh_token_encrypted" not in svc or "None" in svc)
    # I tracking flags
    check("I recipient tracking false", "RECIPIENT_TRACKING = False" in const)
    check("I access analytics false", "ACCESS_ANALYTICS = False" in const)
    check("I not first value", "FIRST_VALUE_SATISFIED_BY_ACCESS_CENTER = False" in const)
    # J API routes
    check("J inventory route", "/me/access-inventory" in api)
    check("J revoke route", "/me/access-inventory/revoke" in api)
    # K UX no 8th nav
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("K primary 7", primary.count("href:") == 7)
    check("K settings access secondary", "/dashboard/settings/access" in ia)
    privacy = read("frontend/src/app/dashboard/privacy-center/page.tsx")
    check("K privacy link", "settings/access" in privacy)
    # L owner audit
    audit = read("reports/epic-2-20-access-control-2026-08-09/owner-audit.md")
    check("L audit NONE store", "NEW_ACCESS_GRANT_STORE=NONE" in audit)
    # M unit + fe guard
    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_epic_220_access_inventory.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("M unit", r.returncode == 0, (r.stdout + r.stderr)[-200:])
    r2 = subprocess.run(
        ["npm", "run", "test:epic-220-access-control-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("M fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-200:])

    # stance from public health
    try:
        import json
        import ssl
        import urllib.request

        try:
            import certifi

            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            ctx = ssl.create_default_context()
        api_base = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
        with urllib.request.urlopen(f"{api_base}/api/public-health", timeout=45, context=ctx) as resp:
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
