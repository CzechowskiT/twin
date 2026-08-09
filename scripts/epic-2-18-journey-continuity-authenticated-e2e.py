#!/usr/bin/env python3
"""Epic 2.18 — authenticated synthetic E2E (product + stance + canary invariant)."""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()

PRODUCT_PASS = PRODUCT_FAIL = 0
STANCE_PASS = STANCE_FAIL = 0
INVARIANT_PASS = INVARIANT_FAIL = 0

INVARIANT_KEYS = [
    "rc1_launch",
    "rc1_external_pilot_enrollment_enabled",
    "rc1_one_candidate_canary_ready",
    "rc1_one_candidate_canary_state",
    "rc1_one_candidate_canary_active",
    "rc1_canary_activation_command",
    "rc1_effective_canary_cap",
    "rc1_effective_cohort_cap",
    "rc1_real_canary_designation_count",
    "rc1_real_canary_designation_status",
    "rc1_real_canary_candidate_designated_ready",
    "rc1_pilot_runtime_state",
    "rc1_invite_send_enabled",
]


def check(bucket: str, name: str, ok: bool, detail: str = "") -> None:
    global PRODUCT_PASS, PRODUCT_FAIL, STANCE_PASS, STANCE_FAIL, INVARIANT_PASS, INVARIANT_FAIL
    label = f"{bucket}/{name}"
    if ok:
        if bucket == "product":
            PRODUCT_PASS += 1
        elif bucket == "stance":
            STANCE_PASS += 1
        else:
            INVARIANT_PASS += 1
        print(f"PASS  {label}" + (f" — {detail}" if detail else ""))
    else:
        if bucket == "product":
            PRODUCT_FAIL += 1
        elif bucket == "stance":
            STANCE_FAIL += 1
        else:
            INVARIANT_FAIL += 1
        print(f"FAIL  {label}" + (f" — {detail}" if detail else ""))


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw = resp.read().decode("utf-8", errors="replace") or "{}"
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, {"_raw_len": len(raw)}
    except urllib.error.HTTPError as exc:
        raw = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"_raw_len": len(raw)}


def _public_health() -> dict:
    req = urllib.request.Request(f"{FE}/api/public-health", method="GET")
    with urllib.request.urlopen(req, timeout=45, context=_CTX) as resp:
        return json.loads(resp.read().decode())


def _inv(h: dict) -> dict:
    return {k: h.get(k) for k in INVARIANT_KEYS}


def main() -> int:
    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    before = _public_health()
    before_inv = _inv(before)
    check("stance", "public_health", True)
    check("stance", "launch_nogo", before.get("rc1_launch") == "NO-GO")
    check(
        "stance",
        "enrollment_off",
        before.get("rc1_external_pilot_enrollment_enabled") is False,
    )
    check(
        "stance",
        "canary_inactive",
        before.get("rc1_one_candidate_canary_active") is False,
    )
    check(
        "stance",
        "activation_prepared",
        before.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
    )
    check(
        "stance",
        "designation_0",
        int(before.get("rc1_real_canary_designation_count") or 0) == 0,
    )
    check(
        "stance",
        "caps_zero",
        int(before.get("rc1_effective_canary_cap") or 0) == 0
        and int(before.get("rc1_effective_cohort_cap") or 0) == 0,
    )

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    if not token:
        return 1

    code, _ = _req("GET", "/api/v1/candidates/me/journey-continuity/catalog")
    check("product", "unauth_blocked", code in {401, 403}, str(code))

    code, cat = _req("GET", "/api/v1/candidates/me/journey-continuity/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_journey_session/v1",
    )
    check(
        "product",
        "parallel_none",
        isinstance(cat, dict) and cat.get("parallel_checkpoint_store") == "NONE",
    )
    check(
        "product",
        "six_flows",
        isinstance(cat, dict) and len(cat.get("flow_kinds") or []) == 6,
    )
    check(
        "product",
        "matrix_48",
        isinstance(cat, dict) and cat.get("adapter_matrix_cells") == 48,
    )
    check(
        "product",
        "not_fv",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_continuity") is False,
    )
    check(
        "product",
        "no_eighth_nav",
        isinstance(cat, dict) and cat.get("eighth_primary_nav") is False,
    )
    check(
        "product",
        "no_reminders",
        isinstance(cat, dict) and cat.get("email_push_reminders") is False,
    )

    code, matrix = _req(
        "GET", "/api/v1/candidates/me/journey-continuity/adapter-matrix", token=token
    )
    check(
        "product",
        "adapter_matrix_48",
        code == 200
        and isinstance(matrix, dict)
        and matrix.get("pass_count") == 48
        and matrix.get("total") == 48,
        str(code),
    )

    code, cp = _req(
        "POST",
        "/api/v1/candidates/me/journey-continuity/checkpoint",
        token=token,
        body={
            "flow_kind": "CANDIDATE_PATH_READINESS",
            "step_key": "selected",
            "explicit": True,
        },
    )
    check(
        "product",
        "checkpoint_ok",
        code == 200 and isinstance(cp, dict) and cp.get("created") is True,
        str(code),
    )
    sk = (cp or {}).get("session_key") or ""
    check("product", "checkpoint_not_fv", isinstance(cp, dict) and cp.get("first_value_satisfied") is False)

    code, cont = _req("GET", "/api/v1/candidates/me/journey-continuity/continue", token=token)
    check(
        "product",
        "continue_list",
        code == 200
        and isinstance(cont, dict)
        and cont.get("urgency") is False
        and cont.get("reminders") is False,
        str(code),
    )

    code, resumed = _req(
        "POST",
        f"/api/v1/candidates/me/journey-continuity/sessions/{sk}/resume",
        token=token,
        body={"client_revision": 1},
    )
    check(
        "product",
        "resume_exact",
        code == 200
        and isinstance(resumed, dict)
        and resumed.get("resume_mode") == "EXACT_CHECKPOINT"
        and resumed.get("mutates_on_resume") is False,
        str(code),
    )

    code, _ = _req(
        "POST",
        f"/api/v1/candidates/me/journey-continuity/sessions/{sk}/bump",
        token=token,
    )
    check("product", "bump_ok", code == 200, str(code))

    code, stale = _req(
        "POST",
        f"/api/v1/candidates/me/journey-continuity/sessions/{sk}/resume",
        token=token,
        body={"client_revision": 1},
    )
    check(
        "product",
        "resume_stale_safe_review",
        code == 200
        and isinstance(stale, dict)
        and stale.get("resume_mode") == "SAFE_REVIEW",
        str(code),
    )

    code, pinned = _req(
        "POST",
        f"/api/v1/candidates/me/journey-continuity/sessions/{sk}/pin",
        token=token,
        body={"pinned": True},
    )
    check(
        "product",
        "pin_ok",
        code == 200 and isinstance(pinned, dict) and pinned.get("pinned") is True,
        str(code),
    )

    code, cleared = _req(
        "POST",
        f"/api/v1/candidates/me/journey-continuity/sessions/{sk}/clear",
        token=token,
    )
    check(
        "product",
        "clear_ok",
        code == 200 and isinstance(cleared, dict) and cleared.get("cleared") is True,
        str(code),
    )

    # path readiness still works (2.16 ownership)
    code, path_cat = _req("GET", "/api/v1/candidates/me/path-readiness/catalog", token=token)
    check(
        "product",
        "path_readiness_intact",
        code == 200
        and isinstance(path_cat, dict)
        and path_cat.get("schema_id") == "twin.candidate_path_readiness/v1",
        str(code),
    )

    after = _public_health()
    after_inv = _inv(after)
    diffs = {
        k: (before_inv[k], after_inv[k])
        for k in INVARIANT_KEYS
        if before_inv[k] != after_inv[k]
    }
    check("invariant", "business_state_diff_0", len(diffs) == 0, json.dumps(diffs)[:200])
    check(
        "invariant",
        "canary_ready_inactive",
        after.get("rc1_one_candidate_canary_state") == "READY_INACTIVE"
        and after.get("rc1_one_candidate_canary_active") is False,
    )
    check(
        "invariant",
        "designation_still_0",
        int(after.get("rc1_real_canary_designation_count") or 0) == 0,
    )
    check(
        "invariant",
        "activation_still_prepared",
        after.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
    )

    print(
        f"\nproduct {PRODUCT_PASS}/{PRODUCT_PASS + PRODUCT_FAIL} "
        f"stance {STANCE_PASS}/{STANCE_PASS + STANCE_FAIL} "
        f"invariant {INVARIANT_PASS}/{INVARIANT_PASS + INVARIANT_FAIL}"
    )
    return 0 if (PRODUCT_FAIL + STANCE_FAIL + INVARIANT_FAIL) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
