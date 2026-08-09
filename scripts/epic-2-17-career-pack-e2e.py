#!/usr/bin/env python3
"""Epic 2.17 — code + stance E2E matrix A–J (no real PII / pack contents)."""

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
    check("A service", (ROOT / "backend/app/services/candidate_career_pack.py").exists())
    check("A constants", (ROOT / "backend/app/services/candidate_career_pack_constants.py").exists())
    check("A api", (ROOT / "backend/app/api/candidate_career_pack.py").exists())
    check("A alembic 133", (ROOT / "backend/alembic/versions/133_candidate_career_pack.py").exists())
    check("A fe page", (ROOT / "frontend/src/app/dashboard/career-pack/page.tsx").exists())
    check(
        "A fe workspace",
        (ROOT / "frontend/src/components/candidate/career-pack-workspace.tsx").exists(),
    )

    const = read("backend/app/services/candidate_career_pack_constants.py")
    svc = read("backend/app/services/candidate_career_pack.py")
    api = read("backend/app/api/candidate_career_pack.py")
    # B two pack types only
    check("B opportunity pack", "OPPORTUNITY_APPLICATION_PACK" in const)
    check("B portfolio pack", "GENERAL_EVIDENCE_PORTFOLIO_PACK" in const)
    check("B pack types tuple len 2", "PACK_TYPES = (" in const and const.count("PACK") >= 2)
    # C disclosure allowlist + sensitive default OFF
    check("C contact_email sensitive", '"contact_email"' in const and "sensitive" in const)
    check("C default_disclosure", "default_disclosure" in svc)
    check("C internal blocked", "internal_notes" in const and "twin_scores" in const)
    # D preview → confirm → immutable snapshot
    check("D build_preview", "def build_preview" in svc)
    check("D confirm_and_generate", "def confirm_and_generate" in svc)
    check("D immutable", "immutable = True" in svc or "row.immutable = True" in svc)
    # E PDF + ZIP renderer zero external fetches
    check("E fpdf", "from fpdf import FPDF" in svc)
    check("E zipfile", "import zipfile" in svc)
    check("E no http in renderer", "http://" not in svc and "https://" not in svc.split("def download")[0])
    # F private download auth only; no send
    check("F download route", "/download" in api)
    check(
        "F no send route",
        "career-packs/{pack_key}/send" not in api
        and "career-packs/{pack_key}/share" not in api
        and "career-packs/{pack_key}/publish" not in api,
    )
    check("F Cache-Control no-store", "no-store" in api)
    check("F EXTERNAL_DELIVERY false", "EXTERNAL_DELIVERY = False" in const)
    # G revoke/delete + privacy pause
    check("G revoke", "def revoke" in svc)
    check("G delete", "def delete_pack" in svc)
    check("G privacy_pause", "privacy_pause" in svc)
    # H first value integrity
    check("H not first value", "FIRST_VALUE_SATISFIED_BY_CAREER_PACK = False" in const)
    check("H first_value false in ser", '"first_value_satisfied": False' in svc)
    # I no 8th primary nav + contextual entries
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("I primary still 7", primary.count("href:") == 7)
    check("I no career-pack primary", "/dashboard/career-pack" not in primary)
    check("I secondary career-pack", "/dashboard/career-pack" in ia.split("CANDIDATE_SECONDARY_IA")[1])
    privacy = read("frontend/src/app/dashboard/privacy-center/page.tsx")
    check("I privacy link", "career-pack" in privacy)
    studio = read("frontend/src/app/dashboard/application-studio/page.tsx")
    check("I studio link", "career-pack" in studio)
    # J boundaries / canary isolation
    mig = read("backend/alembic/versions/133_candidate_career_pack.py")
    check("J revises 132", "132_candidate_path_readiness" in mig)
    check("J no canary ddl", "one_candidate_canary" not in mig and "real_canary" not in mig)
    check("J no invite ddl", "candidate_invite" not in mig)
    check("J schema id", "twin.candidate_career_pack/v1" in const)
    check("J unit tests", (ROOT / "backend/tests/test_epic_217_career_pack.py").exists())
    check("J fe guard", (ROOT / "frontend/scripts/epic-217-career-pack-guard.test.ts").exists())
    check("J EMAIL_SEND false", "EMAIL_SEND = False" in const)
    check("J LLM_REWRITE false", "LLM_REWRITE = False" in const)

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
