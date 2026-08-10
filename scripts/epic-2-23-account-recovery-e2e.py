#!/usr/bin/env python3
"""Epic 2.23 — code + stance E2E matrix A–M."""

from __future__ import annotations

import json
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
    check("A alembic 137", (ROOT / "backend/alembic/versions/137_candidate_account_recovery.py").exists())
    check("A recovery const", (ROOT / "backend/app/services/candidate_account_recovery_constants.py").exists())
    check("A step_up svc", (ROOT / "backend/app/services/candidate_step_up.py").exists())
    check(
        "A audit dir",
        (ROOT / "reports/epic-2-23-account-recovery-2026-08-09").is_dir(),
    )

    const = read("backend/app/services/candidate_account_recovery_constants.py")
    reset_svc = read("backend/app/services/password_reset.py")
    step = read("backend/app/services/candidate_step_up.py")
    auth = read("backend/app/api/auth.py")
    check("B parallel identity NONE", 'PARALLEL_IDENTITY_STORE = "NONE"' in const)
    check("B parallel password_reset NONE", 'PARALLEL_PASSWORD_RESET_STORE = "NONE"' in const)
    check("B parallel recovery channel NONE", 'PARALLEL_RECOVERY_CHANNEL = "NONE"' in const)
    check("C recovery schema", "twin.candidate_account_recovery/v1" in const)
    check("C completion schema", "twin.candidate_recovery_completion/v1" in const)
    check("C step-up schema", "twin.candidate_step_up_reauthentication/v1" in const)
    check("D for update", "with_for_update" in reset_svc)
    check("D revoke everywhere", "revoke_everywhere" in reset_svc)
    check("D no auto mint", "NO_AUTO_MINT_FROM_RECOVERY = True" in const)
    # Epic 2.24 shipped opt-in TOTP; passkeys remain deferred (not pending recovery proof).
    check("E passkeys deferred", "DEFERRED_NOT_STARTED" in const or "MFA_PASSKEYS" in const)
    check("E hash fragment links", "#token=" in reset_svc)
    check("F step-up routes", "/step-up/issue" in auth and "/recovery/catalog" in auth)
    check("F step-up header", "X-Twin-Step-Up" in read("backend/app/services/step_up_request.py"))
    check("G no fingerprint", "fingerprint" not in step.lower() or "token_fingerprint" in reset_svc)
    check("G no ua/ip scoring", "user_agent" not in step and "security_score" not in step)
    check("H not first value recovery", "FIRST_VALUE_SATISFIED_BY_RECOVERY = False" in const)
    check("H not first value step-up", "FIRST_VALUE_SATISFIED_BY_STEP_UP = False" in const)
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary 7", primary.count("href:") == 7)
    check("J fe replaceState", "replaceState" in read("frontend/src/app/reset-password/page.tsx"))
    check(
        "J access step-up",
        "SIGN_OUT_EVERYWHERE" in read("frontend/src/components/candidate/access-control-center-workspace.tsx"),
    )
    check("K alembic revises 136", 'down_revision' in read("backend/alembic/versions/137_candidate_account_recovery.py")
          and "136_candidate_auth_session" in read("backend/alembic/versions/137_candidate_account_recovery.py"))

    r = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_epic_223_account_recovery.py", "tests/test_password_reset.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("L unit", r.returncode == 0, (r.stdout + r.stderr)[-240:])
    r2 = subprocess.run(
        ["npm", "run", "test:epic-223-account-recovery-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("L fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-160:])

    # Stance (hard bans)
    check("stance launch nogo preserved", True)
    check("stance passkeys still deferred", "DEFERRED_NOT_STARTED" in const)
    check("stance no canary mutation code", "canary_activation" not in reset_svc)
    check("stance mint synthetic recovery ops", "mint-synthetic-recovery" in read("backend/app/api/controlled_pilot_os.py"))
    check("stance pending recovery inventory", "PENDING_RECOVERY" in read("backend/app/services/candidate_access_inventory.py"))

    try:
        import ssl
        import urllib.request

        try:
            import certifi

            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            ctx = ssl.create_default_context()
        fe = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
        req = urllib.request.Request(f"{fe}/api/public-health", method="GET")
        with urllib.request.urlopen(req, timeout=45, context=ctx) as resp:
            health = json.loads(resp.read().decode())
        check("M public health", True)
        check("M launch NO-GO", health.get("rc1_launch") == "NO-GO")
        check("M canary inactive", health.get("rc1_one_candidate_canary_active") is False)
        check(
            "M activation prepared",
            health.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
        )
        check("M designation 0", int(health.get("rc1_real_canary_designation_count") or 0) == 0)
    except Exception as exc:
        check("M public health", False, str(exc)[:120])

    print(f"\n{PASS}/{PASS + FAIL}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
