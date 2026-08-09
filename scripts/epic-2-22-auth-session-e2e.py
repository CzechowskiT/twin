#!/usr/bin/env python3
"""Epic 2.22 — code + stance E2E matrix A–M."""

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
    check("A alembic 136", (ROOT / "backend/alembic/versions/136_candidate_auth_session.py").exists())
    check("A service", (ROOT / "backend/app/services/candidate_auth_session.py").exists())
    check("A constants", (ROOT / "backend/app/services/candidate_auth_session_constants.py").exists())
    check("A audit", (ROOT / "reports/epic-2-22-account-session-security-2026-08-09/owner-audit.md").exists())

    const = read("backend/app/services/candidate_auth_session_constants.py")
    svc = read("backend/app/services/candidate_auth_session.py")
    deps = read("backend/app/core/deps.py")
    auth = read("backend/app/api/auth.py")
    check("B parallel identity NONE", 'PARALLEL_IDENTITY_STORE = "NONE"' in const)
    check("B parallel credential NONE", 'PARALLEL_CREDENTIAL_STORE = "NONE"' in const)
    check("B canonical authority", "twin.candidate_auth_session" in const)
    check("C session schema", "twin.candidate_auth_session/v1" in const)
    check("C refresh schema", "twin.candidate_refresh_token_family/v1" in const)
    check("C security schema", "twin.candidate_auth_security_state/v1" in const)
    check("D for update", "with_for_update" in svc)
    check("D reuse family", "REUSE_SUSPECTED" in const or "family_reuse" in svc)
    check("E legacy accept", "LEGACY_TOKEN_ACCEPTANCE" in const)
    check("E no mass logout", "NO_MASS_FORCED_LOGOUT = True" in const)
    check("F validate in deps", "validate_access_token" in deps)
    check("F refresh route", "/refresh" in auth)
    check("F logout route", "/logout" in auth)
    check("G digest only", "_digest" in svc and "hmac" in svc)
    check("G no device tracking fields", "last_active" not in svc and "user_agent" not in svc)
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_AUTH_SESSION = False" in const)
    check("H provider gate", "BUILD_INTERNAL_MANAGED_SESSION_LAYER" in svc)
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary 7", primary.count("href:") == 7)
    check("J fe logoutSession", "logoutSession" in read("frontend/src/lib/auth.ts"))
    check("J access recovery", "forgot-password" in read("frontend/src/components/candidate/access-control-center-workspace.tsx"))
    check("K previous_digest", "previous_digest" in read("backend/alembic/versions/136_candidate_auth_session.py"))

    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_epic_222_auth_session.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("L unit", r.returncode == 0, (r.stdout + r.stderr)[-200:])
    r2 = subprocess.run(
        ["npm", "run", "test:epic-222-auth-session-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("L fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-160:])
    check("M no alembic 137", not (ROOT / "backend/alembic/versions/137_").exists())

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
        check("stance public-health", False, str(exc)[:120])

    print(f"\n{PASS} passed, {FAIL} failed")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
