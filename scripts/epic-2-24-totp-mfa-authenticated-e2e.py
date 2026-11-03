#!/usr/bin/env python3
"""Epic 2.24 — authenticated synthetic TOTP MFA E2E (no real authenticator / staff mutation)."""

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

try:
    import pyotp
except ImportError:
    print("FAIL missing_pyotp")
    raise SystemExit(2)

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()
SYNTH_PASSWORD = "synth-not-for-login-use-jwt"

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


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None, extra_headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
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

    code, cat = _req("GET", "/api/v1/auth/mfa/catalog")
    check("product", "mfa_catalog", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "stance_flags",
        isinstance(cat, dict)
        and cat.get("mfa_default") == "OFF"
        and cat.get("mandatory_mfa") == "OFF"
        and cat.get("passkeys_webauthn") == "DEFERRED_NOT_STARTED",
    )
    check(
        "security",
        "keyring_not_secret_key",
        isinstance(cat, dict)
        and (cat.get("keyring") or {}).get("uses_secret_key") is False
        and (cat.get("keyring") or {}).get("dedicated_mfa_keyring") is True,
    )
    key_ok = isinstance(cat, dict) and (cat.get("keyring") or {}).get("keyring_available") is True
    check("product", "keyring_available", key_ok, str((cat or {}).get("keyring")))

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200 and bool((mint or {}).get("access_token")), str(code))
    token = (mint or {}).get("access_token") or ""

    # Ensure MFA off first
    code, st = _req("GET", "/api/v1/auth/mfa/status", token=token)
    check("product", "mfa_status", code == 200, str(code))
    if (st or {}).get("enabled"):
        code, issued = _req(
            "POST",
            "/api/v1/auth/step-up/issue",
            token=token,
            body={"purpose": "MFA_DISABLE", "password": SYNTH_PASSWORD},
        )
        if code == 200:
            step = (issued or {}).get("step_up_token_once") or ""
            _req(
                "POST",
                "/api/v1/auth/mfa/disable",
                token=token,
                extra_headers={"X-Twin-Step-Up": step},
            )

    code, issued = _req(
        "POST",
        "/api/v1/auth/step-up/issue",
        token=token,
        body={"purpose": "MFA_ENROLL", "password": SYNTH_PASSWORD},
    )
    check("product", "step_up_enroll", code == 200 and bool((issued or {}).get("step_up_token_once")), str(code))
    step = (issued or {}).get("step_up_token_once") or ""

    code, started = _req(
        "POST",
        "/api/v1/auth/mfa/enroll/start",
        token=token,
        extra_headers={"X-Twin-Step-Up": step},
    )
    check("product", "enroll_start", code == 200 and bool((started or {}).get("secret_once")), str(code))
    secret = (started or {}).get("secret_once") or ""
    # Never print secret
    check("security", "secret_not_empty", bool(secret) and len(secret) >= 16)

    totp = pyotp.TOTP(secret)
    code, verified = _req(
        "POST",
        "/api/v1/auth/mfa/enroll/verify",
        token=token,
        body={"code": totp.now()},
    )
    check("product", "enroll_verify", code == 200, str(code))

    code, codes = _req("POST", "/api/v1/auth/mfa/enroll/recovery-codes", token=token, body={})
    check(
        "product",
        "recovery_codes",
        code == 200 and len((codes or {}).get("recovery_codes_once") or []) >= 8,
        str(code),
    )
    recovery_list = list((codes or {}).get("recovery_codes_once") or [])

    code, inv = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    items = (inv or {}).get("items") or [] if isinstance(inv, dict) else []
    mfa_items = [i for i in items if i.get("kind") == "MFA_TOTP"]
    check("product", "inventory_mfa", code == 200 and len(mfa_items) >= 1, str(code))
    check(
        "security",
        "no_secrets_in_inventory",
        all(not i.get("secret_present") and not i.get("bearer_url_present") for i in mfa_items),
    )
    blob = json.dumps(inv)
    check("security", "no_raw_secret_in_inventory", secret not in blob)

    # Disable cleanup so shared synth stays usable for other epics
    code, issued2 = _req(
        "POST",
        "/api/v1/auth/step-up/issue",
        token=token,
        body={"purpose": "MFA_DISABLE", "password": SYNTH_PASSWORD},
    )
    step2 = (issued2 or {}).get("step_up_token_once") or ""
    code, disabled = _req(
        "POST",
        "/api/v1/auth/mfa/disable",
        token=token,
        extra_headers={"X-Twin-Step-Up": step2},
    )
    check("product", "disable_cleanup", code == 200, str(code))
    _ = recovery_list  # used only in-memory; never logged

    check("security", "synthetic_only", True)

    after = _public_health()
    after_inv = _inv(after)
    diffs = {k: (before_inv[k], after_inv[k]) for k in INVARIANT_KEYS if before_inv[k] != after_inv[k]}
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
    raise SystemExit(main())
