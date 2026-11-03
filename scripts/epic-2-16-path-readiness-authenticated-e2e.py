#!/usr/bin/env python3
"""Epic 2.16 — authenticated synthetic E2E (product + stance + canary invariant)."""

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
                return resp.status, raw[:400]
    except urllib.error.HTTPError as exc:
        raw = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw[:400]


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

    code, _ = _req("GET", "/api/v1/candidates/me/path-readiness/catalog")
    check("product", "unauth_blocked", code in {401, 403}, str(code))

    code, cat = _req("GET", "/api/v1/candidates/me/path-readiness/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_path_readiness/v1",
    )
    check(
        "product",
        "five_paths",
        isinstance(cat, dict) and len(cat.get("path_kinds") or []) == 5,
    )
    check(
        "product",
        "no_best_path",
        isinstance(cat, dict) and cat.get("recommends_best_path") is False,
    )
    check(
        "product",
        "no_scores",
        isinstance(cat, dict) and cat.get("person_employability_scores") is False,
    )
    check(
        "product",
        "not_first_value",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_path_readiness") is False,
    )
    check(
        "product",
        "no_eighth_nav",
        isinstance(cat, dict) and cat.get("eighth_primary_nav") is False,
    )

    code, opts = _req("GET", "/api/v1/candidates/me/path-readiness/options", token=token)
    check("product", "options_200", code == 200 and isinstance(opts, dict), str(code))
    paths = (opts or {}).get("paths") or []
    check("product", "options_five", len(paths) == 5, str(len(paths)))
    check(
        "product",
        "healthy_empty_startable",
        all(p.get("path_state") == "STARTABLE" for p in paths),
    )
    check("product", "options_mutations_0", (opts or {}).get("mutations") == 0)

    code, sel = _req(
        "POST",
        "/api/v1/candidates/me/path-readiness/select",
        token=token,
        body={"path_kind": "EVALUATE_ONE_OPPORTUNITY"},
    )
    check(
        "product",
        "select_startable",
        code == 200 and isinstance(sel, dict) and sel.get("path_state") == "STARTABLE",
        str(code),
    )
    sk = (sel or {}).get("session_key") or ""
    check("product", "select_not_fv", isinstance(sel, dict) and sel.get("first_value_satisfied") is False)

    code, ev = _req(f"GET", f"/api/v1/candidates/me/path-readiness/sessions/{sk}", token=token)
    check("product", "evaluate_200", code == 200 and isinstance(ev, dict), str(code))
    check("product", "evaluate_mutations_0", isinstance(ev, dict) and ev.get("mutations") == 0)

    code, click = _req(
        "POST",
        f"/api/v1/candidates/me/path-readiness/sessions/{sk}/route-click",
        token=token,
        body={"deep_link": "/dashboard/matches"},
    )
    check(
        "product",
        "click_not_fv",
        code == 200 and isinstance(click, dict) and click.get("satisfies_first_value") is False,
        str(code),
    )

    code, recalc = _req(
        "POST",
        f"/api/v1/candidates/me/path-readiness/sessions/{sk}/recalculate",
        token=token,
    )
    check(
        "product",
        "data_trust_recalc_no_auto",
        code == 200
        and isinstance(recalc, dict)
        and recalc.get("auto_continue") is False
        and recalc.get("data_trust_handoff_return") is True,
        str(code),
    )

    code, search = _req(
        "POST",
        "/api/v1/candidates/me/workspace-search",
        token=token,
        body={"q": "path-readiness"},
    )
    check(
        "product",
        "search_mutations_0",
        code == 200 and isinstance(search, dict) and search.get("mutations") == 0,
        str((search or {}).get("mutations")),
    )

    code, cleared = _req(
        "POST",
        f"/api/v1/candidates/me/path-readiness/sessions/{sk}/clear",
        token=token,
    )
    check("product", "clear_ok", code == 200 and isinstance(cleared, dict) and cleared.get("cleared") is True)

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
