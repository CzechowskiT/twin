#!/usr/bin/env python3
"""Epic 2.19 — authenticated synthetic E2E + recipient exchange (cleanup to 0 grants)."""

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
    headers_extra: dict | None = None,
):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if headers_extra:
        headers.update(headers_extra)
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

    code, cat = _req("GET", "/api/v1/candidates/me/career-packs/share/catalog", token=token)
    check("product", "share_catalog", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict)
        and cat.get("schema_id") == "twin.candidate_career_pack_share_grant/v1",
    )
    check(
        "product",
        "no_outbound",
        isinstance(cat, dict) and cat.get("outbound_send") is False,
    )
    check(
        "product",
        "no_tracking",
        isinstance(cat, dict) and cat.get("recipient_tracking") is False,
    )
    check(
        "product",
        "not_fv",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_share_grant") is False,
    )
    check(
        "product",
        "parallel_none",
        isinstance(cat, dict) and cat.get("parallel_career_pack_store") == "NONE",
    )

    # Build READY pack
    code, draft = _req(
        "POST",
        "/api/v1/candidates/me/career-packs",
        token=token,
        body={"pack_type": "GENERAL_EVIDENCE_PORTFOLIO_PACK", "title": "Share Synth"},
    )
    check("product", "create_draft", code == 200, str(code))
    pack_key = (draft or {}).get("pack_key") or ""
    code, _ = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/selection",
        token=token,
        body={"artifact_refs": [], "disclosure": {"display_name": True}},
    )
    check("product", "selection", code == 200, str(code))
    code, preview = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/preview",
        token=token,
        body={"stale_confirmed": True},
    )
    check("product", "preview", code == 200 and bool((preview or {}).get("preview_hash")), str(code))
    ph = (preview or {}).get("preview_hash") or ""
    code, ready = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/confirm",
        token=token,
        body={"preview_hash": ph},
    )
    check(
        "product",
        "confirm_ready",
        code == 200 and (ready or {}).get("state") == "READY",
        str(code),
    )
    snap = (ready or {}).get("snapshot_hash") or ""

    code, grant = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/shares",
        token=token,
        body={
            "permission": "INLINE_VIEW",
            "ttl_hours": 24,
            "disclosure_hash": snap,
            "confirm_disclosure": True,
        },
    )
    check(
        "product",
        "create_grant",
        code == 200 and isinstance(grant, dict) and grant.get("created") is True,
        str(code),
    )
    # Never print full share URL / secret
    has_once = bool((grant or {}).get("share_url_once")) and "#key=" in str(
        (grant or {}).get("share_url_once")
    )
    check("product", "share_url_once_present", has_once)
    check("product", "grant_not_fv", (grant or {}).get("first_value_satisfied") is False)
    public_id = (grant or {}).get("public_id") or ""
    secret = str((grant or {}).get("share_url_once") or "").split("#key=")[-1]
    grant_key = (grant or {}).get("grant_key") or ""

    code, meta = _req("GET", f"/api/v1/share/career-pack/{public_id}/meta")
    check(
        "security",
        "meta_no_leak",
        code == 200 and (meta or {}).get("signup_cta") is False,
        str(code),
    )

    code, bad = _req(
        "POST",
        f"/api/v1/share/career-pack/{public_id}/exchange",
        body={"secret": "definitely-wrong-secret-value"},
    )
    check("security", "bad_secret_generic", code in {404, 401, 403}, str(code))

    code, ex = _req(
        "POST",
        f"/api/v1/share/career-pack/{public_id}/exchange",
        body={"secret": secret},
    )
    check(
        "product",
        "exchange_ok",
        code == 200 and isinstance(ex, dict) and ex.get("ok") is True,
        str(code),
    )
    sess = (ex or {}).get("session_token") or ""
    check("product", "session_token", bool(sess))

    code, view = _req(
        "GET",
        f"/api/v1/share/career-pack/{public_id}/view",
        headers_extra={"X-Twin-Share-Session": sess},
    )
    check(
        "product",
        "recipient_view",
        code == 200
        and isinstance(view, dict)
        and view.get("signup_cta") is False
        and view.get("recipient_tracking") is False
        and view.get("owner_apis") is False,
        str(code),
    )
    # Do not print sections content

    code, view_unauth = _req("GET", f"/api/v1/share/career-pack/{public_id}/view")
    check("security", "view_without_session", code in {404, 401, 403}, str(code))

    code, revoked = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/shares/{grant_key}/revoke",
        token=token,
    )
    check(
        "product",
        "revoke",
        code == 200 and (revoked or {}).get("state") == "REVOKED",
        str(code),
    )
    code, ex2 = _req(
        "POST",
        f"/api/v1/share/career-pack/{public_id}/exchange",
        body={"secret": secret},
    )
    check("security", "exchange_after_revoke", code in {404, 401, 403}, str(code))

    code, deleted = _req(
        "DELETE",
        f"/api/v1/candidates/me/career-packs/{pack_key}/shares/{grant_key}",
        token=token,
    )
    check(
        "product",
        "delete_grant",
        code == 200 and (deleted or {}).get("deleted") is True,
        str(code),
    )

    # Cleanup posture: no ACTIVE grants left for this synthetic candidate via list
    code, listed = _req(
        "GET",
        f"/api/v1/candidates/me/career-packs/{pack_key}/shares",
        token=token,
    )
    active = [
        g
        for g in ((listed or {}).get("grants") or [])
        if isinstance(g, dict) and g.get("state") == "ACTIVE"
    ]
    check("product", "active_grants_zero", len(active) == 0, str(len(active)))

    # Explicit: no send endpoint
    code, _ = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/shares/send",
        token=token,
        body={},
    )
    check("security", "send_absent", code in {404, 405, 422}, str(code))

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
