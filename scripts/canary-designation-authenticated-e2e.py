#!/usr/bin/env python3
"""Canary designation control — prod synthetic E2E with teardown to count=0.

Uses reserved .invalid probe identity only. Never leaves a real designation.
Never activates canary / raises caps / sends invite.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
import uuid

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()

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


def main() -> int:
    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    probe = f"des-probe-{uuid.uuid4().hex[:10]}@canary-designation.invalid"

    code, health = _req("GET", "/api/v1/health?ops=1")
    check("health_200", code == 200, str(code))
    check("launch_nogo", isinstance(health, dict) and health.get("rc1_launch") == "NO-GO", "")
    check(
        "enrollment_off",
        isinstance(health, dict) and health.get("rc1_external_pilot_enrollment_enabled") is False,
        "",
    )
    check(
        "canary_inactive",
        isinstance(health, dict) and health.get("rc1_one_candidate_canary_active") is False,
        "",
    )
    check(
        "caps_zero",
        isinstance(health, dict) and int(health.get("rc1_effective_canary_cap") or 0) == 0,
        "",
    )

    code, before = _req("GET", "/api/v1/admin/canary/designation", token=OPS)
    check("des_get_200", code == 200 and isinstance(before, dict), str(code))
    start_count = int((before or {}).get("active_count") or 0) if isinstance(before, dict) else -1
    check("start_count_zero_or_known", start_count >= 0, str(start_count))

    # Ensure clean slate for this run
    if start_count > 0:
        _req("POST", "/api/v1/admin/canary/designation/revoke", token=OPS, body={})

    code, unauth = _req("GET", "/api/v1/admin/canary/designation")
    check("unauth_blocked", code in {401, 403}, str(code))

    code, bad = _req(
        "POST",
        "/api/v1/admin/canary/designation",
        token=OPS,
        body={"delivery_identity": "x@example.com", "delivery_channel": "email"},
    )
    check("reject_fixture", code == 400, str(code))

    code, set_out = _req(
        "POST",
        "/api/v1/admin/canary/designation",
        token=OPS,
        body={
            "delivery_identity": probe,
            "delivery_channel": "email",
            "secure_roster_reference": "e2e_probe_roster",
            "replace_existing": True,
        },
    )
    check("designate_200", code == 200 and isinstance(set_out, dict), str(code))
    check(
        "designated_ready",
        isinstance(set_out, dict) and set_out.get("status") == "DESIGNATED_READY",
        str((set_out or {}).get("status") if isinstance(set_out, dict) else ""),
    )
    check(
        "gate_designation_true",
        isinstance(set_out, dict) and set_out.get("gate_ready") is True,
        "",
    )
    check(
        "masked_only",
        isinstance(set_out, dict)
        and bool(set_out.get("delivery_identity_masked"))
        and probe.split("@")[0] not in str(set_out.get("delivery_identity_masked")),
        "",
    )
    # Response must not echo plaintext probe local-part in any field values
    compact = json.dumps(set_out) if isinstance(set_out, dict) else ""
    check("no_plaintext_in_response", probe.split("@")[0] not in compact.lower(), "")

    code, ctl = _req("GET", "/api/v1/admin/canary/control", token=OPS)
    check("control_embeds_des", code == 200 and isinstance(ctl, dict), str(code))
    check(
        "still_not_active",
        isinstance(ctl, dict) and ctl.get("active_one_candidate") is False,
        "",
    )
    check(
        "activation_not_executed",
        isinstance(ctl, dict) and ctl.get("activation_command") == "PREPARED_NOT_EXECUTED",
        "",
    )
    check(
        "invites_still_zero",
        isinstance(ctl, dict) and int(ctl.get("real_invites_created") or 0) == 0,
        "",
    )

    code, pf = _req("GET", "/api/v1/admin/canary/activation-preflight", token=OPS)
    check("preflight_200", code == 200 and isinstance(pf, dict), str(code))
    check(
        "preflight_no_activate",
        isinstance(pf, dict) and pf.get("activates") is False and pf.get("raises_caps") is False,
        "",
    )
    check(
        "preflight_has_des_id",
        isinstance(pf, dict) and bool(pf.get("consumes_designation_id")),
        "",
    )

    # Teardown — mandatory
    code, rev = _req("POST", "/api/v1/admin/canary/designation/revoke", token=OPS, body={})
    check("revoke_200", code == 200 and isinstance(rev, dict), str(code))
    check(
        "teardown_count_zero",
        isinstance(rev, dict) and int(rev.get("active_count") or 0) == 0,
        str((rev or {}).get("active_count") if isinstance(rev, dict) else ""),
    )
    check(
        "teardown_not_designated",
        isinstance(rev, dict) and rev.get("status") == "NOT_DESIGNATED",
        "",
    )

    code, after = _req("GET", "/api/v1/admin/canary/designation", token=OPS)
    check(
        "final_count_zero",
        code == 200 and isinstance(after, dict) and int(after.get("active_count") or 0) == 0,
        "",
    )

    try:
        with urllib.request.urlopen(f"{FE}/preview", timeout=30, context=_CTX) as resp:
            check("pp1_preview_200", resp.status == 200, str(resp.status))
    except Exception as exc:
        check("pp1_preview_200", False, str(exc)[:80])

    print(f"\nCanary designation E2E: {PASS} pass / {FAIL} fail")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
