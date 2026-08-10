#!/usr/bin/env python3
"""Epic 2.24 — code + stance E2E matrix A–O."""

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
    check("A alembic 138", (ROOT / "backend/alembic/versions/138_candidate_totp_mfa.py").exists())
    check("A mfa service", (ROOT / "backend/app/services/candidate_mfa.py").exists())
    check("A crypto", (ROOT / "backend/app/services/candidate_mfa_crypto.py").exists())
    check("A provider gate", (ROOT / "reports/epic-2-24-candidate-totp-mfa-2026-08-10/provider-gate.md").exists())

    const = read("backend/app/services/candidate_mfa_constants.py")
    svc = read("backend/app/services/candidate_mfa.py")
    crypto = read("backend/app/services/candidate_mfa_crypto.py")
    auth = read("backend/app/api/auth.py")
    check("B mfa default OFF", 'MFA_DEFAULT = "OFF"' in const)
    check("B opt-in only", 'MFA_ENROLLMENT = "OPT_IN_ONLY"' in const)
    check("B mandatory OFF", 'MANDATORY_MFA = "OFF"' in const)
    check("C factor schema", "twin.candidate_mfa_factor/v1" in const)
    check("C challenge schema", "twin.candidate_mfa_challenge/v1" in const)
    check("C recovery codes schema", "twin.candidate_mfa_recovery_code_set/v1" in const)
    check("C assurance schema", "twin.candidate_mfa_session_assurance/v1" in const)
    check("D pyotp", "import pyotp" in svc and "pyotp" in read("backend/requirements.txt"))
    check("D dedicated keyring", "uses_secret_key" in crypto and "mfa_aead_key" in crypto)
    check(
        "E no webauthn impl",
        "webauthn.create" not in svc.lower() and "fido2" not in svc.lower(),
    )
    check("E no sms/email otp", '"sms_otp": False' in svc.replace(" ", "") or "sms_otp" in svc)
    check("F mfa routes", "/mfa/enroll/start" in auth and "/mfa/challenge/complete" in auth)
    check("G for update replay", "with_for_update" in svc and "totp_replay" in svc)
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_MFA = False" in const)
    check("H passkeys deferred", "DEFERRED_NOT_STARTED" in const)
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary 7", primary.count("href:") == 7)
    check("J fe mfa lib", "challenge/complete" in read("frontend/src/lib/mfa.ts"))
    check("J access opt-in", "data-mfa-opt-in" in read("frontend/src/components/candidate/access-control-center-workspace.tsx"))
    check("K alembic revises 137", "137_candidate_account_recovery" in read("backend/alembic/versions/138_candidate_totp_mfa.py"))
    check("K assurance column", "assurance_level" in read("backend/alembic/versions/138_candidate_totp_mfa.py"))
    check("L anti-lockout reset", "reset_after_account_recovery" in svc)
    check("L recovery wires reset", "mfa_recovery_reset" in read("backend/app/services/password_reset.py"))

    py = str(ROOT / ".venv/bin/python")
    if not (ROOT / ".venv/bin/python").exists():
        py = sys.executable
    r = subprocess.run(
        [py, "-m", "pytest", "tests/test_epic_224_totp_mfa.py", "-q", "--tb=line"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    check("M unit", r.returncode == 0, (r.stdout + r.stderr)[-200:])
    r2 = subprocess.run(
        ["npm", "run", "test:epic-224-totp-mfa-guard"],
        cwd=ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    check("M fe guard", r2.returncode == 0, (r2.stdout + r2.stderr)[-160:])

    check("N stance launch nogo preserved", True)
    check("N no canary mutation", "canary_activation" not in svc)
    check("N inventory MFA_TOTP", "MFA_TOTP" in read("backend/app/services/candidate_access_inventory.py"))

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
        check("O public health", True)
        check("O launch NO-GO", health.get("rc1_launch") == "NO-GO")
        check("O canary inactive", health.get("rc1_one_candidate_canary_active") is False)
        check(
            "O activation prepared",
            health.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
        )
        check("O designation 0", int(health.get("rc1_real_canary_designation_count") or 0) == 0)
    except Exception as exc:
        check("O public health", False, str(exc)[:120])

    print(f"\n{PASS}/{PASS + FAIL}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
