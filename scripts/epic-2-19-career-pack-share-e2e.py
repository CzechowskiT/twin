#!/usr/bin/env python3
"""Epic 2.19 — code + stance E2E matrix A–L (no secrets/PII/pack content printed)."""

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
    check("A service", (ROOT / "backend/app/services/candidate_career_pack_share.py").exists())
    check("A constants", (ROOT / "backend/app/services/candidate_career_pack_share_constants.py").exists())
    check("A public api", (ROOT / "backend/app/api/career_pack_share_public.py").exists())
    check("A alembic 135", (ROOT / "backend/alembic/versions/135_candidate_career_pack_share.py").exists())
    check("A recipient page", (ROOT / "frontend/src/app/share/career-pack/[publicId]/page.tsx").exists())

    const = read("backend/app/services/candidate_career_pack_share_constants.py")
    svc = read("backend/app/services/candidate_career_pack_share.py")
    pub = read("backend/app/api/career_pack_share_public.py")
    mig = read("backend/alembic/versions/135_candidate_career_pack_share.py")
    # B sole grant store
    check("B PARALLEL none", 'PARALLEL_CAREER_PACK_STORE = "NONE"' in const)
    check("B revises 134", "134_candidate_journey_continuity" in mig)
    check("B grants table only", "candidate_career_pack_share_grants" in mig)
    check("B no content columns", "pdf_bytes" not in mig and "snapshot_json" not in mig)
    # C permissions + states
    check("C INLINE_VIEW", "INLINE_VIEW" in const)
    check("C DOWNLOAD perm", "INLINE_VIEW_AND_DOWNLOAD" in const)
    for st in ("ACTIVE", "EXPIRED", "REVOKED", "PACK_UNAVAILABLE", "DELETED"):
        check(f"C state {st}", st in const)
    # D secret fragment + digest
    check("D secret digest", "_digest" in svc and "sha256" in svc)
    check("D compare_digest", "compare_digest" in svc)
    check("D fragment url", "#key=" in svc)
    check("D SECRET_BYTES >= 32", "SECRET_BYTES = 32" in const)
    # E no send / tracking
    check("E OUTBOUND_SEND false", "OUTBOUND_SEND = False" in const)
    check("E RECIPIENT_TRACKING false", "RECIPIENT_TRACKING = False" in const)
    check("E ACCESS_ANALYTICS false", "ACCESS_ANALYTICS = False" in const)
    check("E EMAIL_SEND false", "EMAIL_SEND = False" in const)
    # F exchange + cookie + rate limit
    check("F exchange route", "/exchange" in pub)
    check("F cookie httponly", "httponly=True" in pub)
    check("F rate limit", "EXCHANGE_RATE_LIMIT" in pub or "_rate_limit" in pub)
    check("F generic unavailable", '"unavailable"' in pub)
    # G recipient headers
    check("G noindex", "noindex" in pub)
    check("G no-referrer", "no-referrer" in pub)
    check("G no-store", "no-store" in pub)
    check("G no signup", "signup_cta" in pub or "signup_cta" in svc)
    # H owner UX no 8th nav
    ia = read("frontend/src/lib/candidate-ia.ts")
    primary = ia.split("CANDIDATE_SECONDARY_IA")[0]
    check("H primary 7", primary.count("href:") == 7)
    ws = read("frontend/src/components/candidate/career-pack-workspace.tsx")
    check("H share in career pack", "data-career-pack-share" in ws)
    # I first value
    check("I not first value", "FIRST_VALUE_SATISFIED_BY_SHARE_GRANT = False" in const)
    # J revoke fail-closed
    check("J revoke", "def revoke_grant" in svc)
    check("J pack unavailable", "PACK_UNAVAILABLE" in svc)
    # K wipe cleanup
    check("K wipe", "wipe_all_grants_for_candidate" in svc)
    # L tests + canary isolation
    check("L unit", (ROOT / "backend/tests/test_epic_219_career_pack_share.py").exists())
    check("L fe guard", (ROOT / "frontend/scripts/epic-219-career-pack-share-guard.test.ts").exists())
    check("L no canary ddl", "one_candidate_canary" not in mig and "real_canary" not in mig)
    check("L no invite ddl", "candidate_invite" not in mig)
    check("L max 5", "MAX_ACTIVE_GRANTS_PER_CANDIDATE = 5" in const)
    check("L ttl max 72", "MAX_TTL_HOURS = 72" in const)

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
