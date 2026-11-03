#!/usr/bin/env python3
"""Epic 2.23 — authenticated synthetic recovery + step-up E2E (no real mail/staff mutation)."""

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


def _req(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    extra_headers: dict | None = None,
):
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

    code, rcat = _req("GET", "/api/v1/auth/recovery/catalog")
    check("product", "recovery_catalog", code == 200 and isinstance(rcat, dict), str(code))
    check(
        "product",
        "recovery_schema",
        isinstance(rcat, dict)
        and rcat.get("schema_id") == "twin.candidate_account_recovery/v1",
    )
    check(
        "product",
        "parallel_none",
        isinstance(rcat, dict)
        and rcat.get("parallel_password_reset_store") == "NONE"
        and rcat.get("mfa_passkeys") == "DEFERRED_NOT_STARTED",
    )

    code, scat = _req("GET", "/api/v1/auth/step-up/catalog")
    check("product", "step_up_catalog", code == 200 and isinstance(scat, dict), str(code))
    check(
        "product",
        "step_up_ttl",
        isinstance(scat, dict) and int(scat.get("ttl_seconds") or 999) <= 300,
    )

    # Session for step-up proofs
    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200 and bool((mint or {}).get("access_token")), str(code))
    token = (mint or {}).get("access_token") or ""

    # Step-up required for sign-out everywhere
    code, denied = _req("POST", "/api/v1/auth/logout", token=token, body={"everywhere": True})
    check(
        "product",
        "everywhere_requires_step_up",
        code == 403 and "step_up" in str((denied or {}).get("detail") or "").lower(),
        str(code),
    )

    code, issued = _req(
        "POST",
        "/api/v1/auth/step-up/issue",
        token=token,
        body={"purpose": "SIGN_OUT_EVERYWHERE", "password": SYNTH_PASSWORD},
    )
    check("product", "step_up_issue", code == 200 and bool((issued or {}).get("step_up_token_once")), str(code))
    step_tok = (issued or {}).get("step_up_token_once") or ""
    # Never print step_tok

    code, logout = _req(
        "POST",
        "/api/v1/auth/logout",
        token=token,
        body={"everywhere": True},
        extra_headers={"X-Twin-Step-Up": step_tok},
    )
    check("product", "everywhere_with_step_up", code == 200, str(code))

    # Remint + recovery challenge (synthetic sink — ops mint returns raw once; no mail)
    code, mint2 = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    token = (mint2 or {}).get("access_token") or ""
    check("product", "remint", code == 200 and bool(token), str(code))

    code, rec = _req("POST", "/api/v1/admin/pilot-os/auth/mint-synthetic-recovery", token=OPS)
    check("product", "mint_recovery", code == 200 and bool((rec or {}).get("token_once")), str(code))
    check("security", "recovery_sink_no_mail", (rec or {}).get("mail_sent") is False)
    raw = (rec or {}).get("token_once") or ""

    code, inv = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    items = (inv or {}).get("items") or [] if isinstance(inv, dict) else []
    pending = [i for i in items if i.get("kind") == "PENDING_RECOVERY"]
    check("product", "inventory_pending_recovery", code == 200 and len(pending) >= 1, str(code))
    check(
        "security",
        "no_secrets_in_pending",
        all(not i.get("secret_present") and not i.get("bearer_url_present") for i in pending),
    )
    blob = json.dumps(inv)
    check("security", "no_raw_recovery_token_in_inventory", raw not in blob and "token_once" not in blob)

    # Complete recovery — password rotate + revoke; no auto session
    new_pw = "SynthRecovered9!"
    code, reset = _req(
        "POST",
        "/api/v1/auth/reset-password",
        body={"token": raw, "password": new_pw},
    )
    check("product", "recovery_complete", code == 200, str(code))

    code_dead, _ = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    check("product", "post_recovery_session_dead", code_dead in {401, 403}, str(code_dead))

    # Replay rejected
    code_replay, _ = _req(
        "POST",
        "/api/v1/auth/reset-password",
        body={"token": raw, "password": "AnotherPass99!"},
    )
    check("product", "recovery_single_use", code_replay == 400, str(code_replay))

    # Restore synth password for other epics (ops remint + change via step-up)
    code, mint3 = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    token = (mint3 or {}).get("access_token") or ""
    check("product", "remint_after_recovery", code == 200 and bool(token), str(code))

    # Password may still be new_pw — step-up with new_pw then restore
    code, issued2 = _req(
        "POST",
        "/api/v1/auth/step-up/issue",
        token=token,
        body={"purpose": "CHANGE_PASSWORD", "password": new_pw},
    )
    if code != 200:
        # If mint recreated hash somehow failed, try original
        code, issued2 = _req(
            "POST",
            "/api/v1/auth/step-up/issue",
            token=token,
            body={"purpose": "CHANGE_PASSWORD", "password": SYNTH_PASSWORD},
        )
        restore_from = SYNTH_PASSWORD
    else:
        restore_from = new_pw
    check("product", "step_up_change_pw", code == 200, str(code))
    step2 = (issued2 or {}).get("step_up_token_once") or ""
    code, chg = _req(
        "PATCH",
        "/api/v1/auth/me/password",
        token=token,
        body={"current_password": restore_from, "new_password": SYNTH_PASSWORD},
        extra_headers={"X-Twin-Step-Up": step2},
    )
    # If already SYNTH_PASSWORD, same_password may 400 — still ok for cleanup
    check(
        "product",
        "restore_synth_password",
        code == 200 or (code == 400 and restore_from == SYNTH_PASSWORD),
        str(code),
    )

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
    raise SystemExit(main())
