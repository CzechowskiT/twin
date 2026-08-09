#!/usr/bin/env python3
"""Epic 2.20 — authenticated synthetic Access Center E2E (restore frozen posture)."""

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

    code, cat = _req("GET", "/api/v1/candidates/me/access-inventory/catalog", token=token)
    check("product", "catalog", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_access_inventory/v1",
    )
    check(
        "product",
        "new_store_none",
        isinstance(cat, dict) and cat.get("new_access_grant_store") == "NONE",
    )
    check(
        "product",
        "no_tracking",
        isinstance(cat, dict) and cat.get("recipient_tracking") is False,
    )
    check(
        "product",
        "not_fv",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_access_center") is False,
    )

    code, inv = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    check("product", "inventory", code == 200 and isinstance(inv, dict), str(code))
    items = (inv or {}).get("items") or []
    check("product", "has_auth_session", any(i.get("kind") == "AUTH_SESSION" for i in items))
    check(
        "security",
        "no_secrets_in_inventory",
        all(
            i.get("secret_present") is False
            and i.get("bearer_url_present") is False
            and "#key=" not in json.dumps(i)
            for i in items
            if isinstance(i, dict)
        ),
    )
    check(
        "security",
        "no_recipient_activity",
        all(i.get("recipient_activity") is None for i in items if isinstance(i, dict)),
    )

    # Build READY pack + share, then revoke via Access Center (synthetic only)
    code, draft = _req(
        "POST",
        "/api/v1/candidates/me/career-packs",
        token=token,
        body={"pack_type": "GENERAL_EVIDENCE_PORTFOLIO_PACK", "title": "Acc Synth"},
    )
    check("product", "create_draft", code == 200, str(code))
    pack_key = (draft or {}).get("pack_key") or ""
    _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/selection",
        token=token,
        body={"artifact_refs": [], "disclosure": {"display_name": True}},
    )
    code, preview = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/preview",
        token=token,
        body={"stale_confirmed": True},
    )
    phash = (preview or {}).get("preview_hash") or ""
    code, ready = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/confirm",
        token=token,
        body={"preview_hash": phash},
    )
    check("product", "confirm_ready", code == 200 and (ready or {}).get("state") == "READY", str(code))
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
    check("product", "create_share", code == 200 and (grant or {}).get("created") is True, str(code))
    # Never print share_url_once

    code, inv2 = _req("GET", "/api/v1/candidates/me/access-inventory", token=token)
    share_item = next(
        (
            i
            for i in ((inv2 or {}).get("items") or [])
            if isinstance(i, dict) and i.get("kind") == "CAREER_PACK_SHARE"
        ),
        None,
    )
    check("product", "share_in_inventory", share_item is not None)

    code, bad = _req(
        "POST",
        "/api/v1/candidates/me/access-inventory/revoke",
        token=token,
        body={
            "access_key": (share_item or {}).get("access_key"),
            "kind": "CAREER_PACK_SHARE",
            "client_revision": (share_item or {}).get("revision"),
            "confirm": False,
        },
    )
    check("security", "confirm_required", code == 400, str(code))

    code, revoked = _req(
        "POST",
        "/api/v1/candidates/me/access-inventory/revoke",
        token=token,
        body={
            "access_key": (share_item or {}).get("access_key"),
            "kind": "CAREER_PACK_SHARE",
            "client_revision": (share_item or {}).get("revision"),
            "confirm": True,
        },
    )
    check(
        "product",
        "revoke_via_center",
        code == 200
        and (revoked or {}).get("revoked") is True
        and (revoked or {}).get("post_condition_verified") is True,
        str(code),
    )

    # Cleanup: delete grant row if still listed as REVOKED
    grant_key = (grant or {}).get("grant_key") or ""
    if grant_key:
        _req(
            "DELETE",
            f"/api/v1/candidates/me/career-packs/{pack_key}/shares/{grant_key}",
            token=token,
        )
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
    check("product", "active_shares_zero", len(active) == 0, str(len(active)))

    code, unauth = _req("GET", "/api/v1/candidates/me/access-inventory")
    check("security", "inventory_requires_auth", code in {401, 403}, str(code))

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
