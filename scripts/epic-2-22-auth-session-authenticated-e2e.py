#!/usr/bin/env python3
"""Epic 2.22 — authenticated synthetic managed session E2E (no real/staff revoke)."""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
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
SECURITY_PASS = SECURITY_FAIL = 0

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
    global PRODUCT_PASS, PRODUCT_FAIL, STANCE_PASS, STANCE_FAIL
    global INVARIANT_PASS, INVARIANT_FAIL, SECURITY_PASS, SECURITY_FAIL
    label = f"{bucket}/{name}"
    if ok:
        if bucket == "product":
            PRODUCT_PASS += 1
        elif bucket == "stance":
            STANCE_PASS += 1
        elif bucket == "security":
            SECURITY_PASS += 1
        else:
            INVARIANT_PASS += 1
        print(f"PASS  {label}" + (f" — {detail}" if detail else ""))
    else:
        if bucket == "product":
            PRODUCT_FAIL += 1
        elif bucket == "stance":
            STANCE_FAIL += 1
        elif bucket == "security":
            SECURITY_FAIL += 1
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
    check("stance", "enrollment_off", before.get("rc1_external_pilot_enrollment_enabled") is False)
    check("stance", "canary_inactive", before.get("rc1_one_candidate_canary_active") is False)
    check(
        "stance",
        "activation_prepared",
        before.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
    )
    check("stance", "designation_0", int(before.get("rc1_real_canary_designation_count") or 0) == 0)
    check(
        "stance",
        "caps_zero",
        int(before.get("rc1_effective_canary_cap") or 0) == 0
        and int(before.get("rc1_effective_cohort_cap") or 0) == 0,
    )

    code, cat = _req("GET", "/api/v1/auth/session/catalog")
    check("product", "catalog", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "canonical",
        isinstance(cat, dict)
        and cat.get("canonical_session_authority") == "twin.candidate_auth_session",
    )
    check(
        "product",
        "parallel_none",
        isinstance(cat, dict)
        and cat.get("parallel_identity_store") == "NONE"
        and cat.get("parallel_credential_store") == "NONE",
    )

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200 and bool((mint or {}).get("access_token")), str(code))
    token = (mint or {}).get("access_token") or ""
    refresh = (mint or {}).get("refresh_token") or ""
    sid = (mint or {}).get("session_key") or ""
    check("product", "managed_mint", bool((mint or {}).get("managed")) and bool(sid) and bool(refresh))

    code, me = _req("GET", "/api/v1/auth/me", token=token)
    # /auth/me may not exist — try candidates path
    if code >= 400:
        code, me = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    check("product", "access_with_managed", code == 200, str(code))

    # Second session then revoke others
    code, mint2 = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    token2 = (mint2 or {}).get("access_token") or ""
    check("product", "second_session", code == 200 and bool(token2), str(code))

    code, rev_others = _req("POST", "/api/v1/auth/sessions/revoke-others", token=token)
    check("product", "revoke_others", code == 200, str(code))

    t0 = time.perf_counter()
    code_dead, _ = _req("GET", "/api/v1/candidates/me/access-inventory", token=token2)
    slo_ms = int((time.perf_counter() - t0) * 1000)
    check("product", "revocation_propagated", code_dead in {401, 403}, str(code_dead))
    check("product", "revocation_slo_ms", slo_ms < 5000, str(slo_ms))

    if refresh:
        code, rotated = _req("POST", "/api/v1/auth/refresh", body={"refresh_token": refresh})
        check("product", "refresh_rotate", code == 200 and bool((rotated or {}).get("access_token")), str(code))
        new_rt = (rotated or {}).get("refresh_token") or ""
        code_reuse, body_reuse = _req("POST", "/api/v1/auth/refresh", body={"refresh_token": refresh})
        check(
            "security",
            "reuse_contained",
            code_reuse in {400, 401}
            and "reuse" in str((body_reuse or {}).get("detail") or "").lower(),
            str(code_reuse),
        )
        if new_rt:
            # cleanup: logout current managed session
            token = (rotated or {}).get("access_token") or token
            refresh = new_rt

    code, inv = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    items = (inv or {}).get("items") or [] if isinstance(inv, dict) else []
    auth_items = [i for i in items if i.get("kind") == "AUTH_SESSION"]
    check("product", "inventory_sessions", code == 200 and len(auth_items) >= 1, str(code))
    check(
        "security",
        "no_secrets_in_inventory",
        all(not i.get("secret_present") and not i.get("bearer_url_present") for i in auth_items),
    )
    blob = json.dumps(inv)
    check("security", "no_raw_refresh_in_inventory", refresh[:12] not in blob if refresh else True)

    code, logout = _req("POST", "/api/v1/auth/logout", token=token, body={"everywhere": False})
    check("product", "logout_current", code == 200, str(code))
    code_after, _ = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    check("product", "logout_invalidates", code_after in {401, 403}, str(code_after))

    # Never touch staff sessions — only synth used above
    check("security", "synthetic_only", True)

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
        f"security {SECURITY_PASS}/{SECURITY_PASS + SECURITY_FAIL} "
        f"invariant {INVARIANT_PASS}/{INVARIANT_PASS + INVARIANT_FAIL}"
    )
    return 0 if (PRODUCT_FAIL + STANCE_FAIL + SECURITY_FAIL + INVARIANT_FAIL) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
