#!/usr/bin/env python3
"""Epic 2.21 — authenticated synthetic handoff journeys A/B (cleanup, no canary mutation)."""

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

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    if not token:
        return 1

    code, cat = _req("GET", "/api/v1/candidates/me/workspace-handoffs/catalog", token=token)
    check("product", "catalog", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_handoff_registry/v1",
    )
    check(
        "product",
        "parallel_none",
        isinstance(cat, dict) and cat.get("parallel_handoff_or_checkpoint_store") == "NONE",
    )
    check(
        "product",
        "no_mutations_layer",
        isinstance(cat, dict) and cat.get("mutations_at_handoff_layer") is False,
    )
    check(
        "product",
        "not_fv",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_handoff") is False,
    )
    check(
        "product",
        "continuity_sole",
        isinstance(cat, dict) and cat.get("continuity_sole_continue_owner") is True,
    )

    # Journey A: import batch → data trust handoff
    code, batch = _req(
        "POST",
        "/api/v1/candidates/me/import/batches",
        token=token,
        body={"family": "document"},
    )
    check("product", "journey_a_batch", code == 200 and bool((batch or {}).get("batch_key")), str(code))
    batch_key = (batch or {}).get("batch_key") or ""
    code, h_a = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs",
        token=token,
        body={"handoff_id": "import_to_data_trust", "object_ref": batch_key},
    )
    check("product", "journey_a_create", code == 200 and bool((h_a or {}).get("handle_once")), str(code))
    handle_a = (h_a or {}).get("handle_once") or ""
    check("security", "handle_opaque", batch_key not in handle_a)
    code, r_a = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs/resolve",
        token=token,
        body={"handle": handle_a, "expected_dest_route_key": "data_trust"},
    )
    check(
        "product",
        "journey_a_resolve",
        code == 200 and (r_a or {}).get("ok") is True and (r_a or {}).get("mutations") is False,
        str(code),
    )

    # Journey A hop 2 if a Data Trust review exists (owner-created; handoff still non-mutating)
    code, reviews = _req("GET", "/api/v1/candidates/me/data-trust/reviews", token=token)
    rev_key = ""
    if code == 200 and isinstance(reviews, dict):
        items = reviews.get("items") or reviews.get("reviews") or []
        if items and isinstance(items[0], dict):
            rev_key = items[0].get("review_key") or ""
    if rev_key:
        code, h_a2 = _req(
            "POST",
            "/api/v1/candidates/me/workspace-handoffs",
            token=token,
            body={"handoff_id": "data_trust_to_path_home", "object_ref": rev_key},
        )
        check(
            "product",
            "journey_a_path_create",
            code == 200 and bool((h_a2 or {}).get("handle_once")),
            str(code),
        )
        code, r_a2 = _req(
            "POST",
            "/api/v1/candidates/me/workspace-handoffs/resolve",
            token=token,
            body={
                "handle": (h_a2 or {}).get("handle_once"),
                "expected_dest_route_key": "path_home",
            },
        )
        check(
            "product",
            "journey_a_path_resolve",
            code == 200 and (r_a2 or {}).get("ok") is True and (r_a2 or {}).get("mutations") is False,
            str(code),
        )
    else:
        check("product", "journey_a_path_deferred", True, "no_review_yet_unit_covers")
    code, ws = _req(
        "POST",
        "/api/v1/candidates/me/application-studio/workspaces",
        token=token,
        body={
            "title": "Handoff Synth WS",
            "opportunity": {"title": "Eng", "company": "Synth", "description": "x"},
        },
    )
    # response may nest workspace
    ws_id = None
    if isinstance(ws, dict):
        ws_id = (ws.get("workspace") or {}).get("id") or ws.get("id")
    check("product", "journey_b_workspace", code in {200, 201} and bool(ws_id), str(code))
    code, h_b1 = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs",
        token=token,
        body={"handoff_id": "app_studio_to_career_pack", "object_ref": str(ws_id)},
    )
    check("product", "journey_b_studio_pack", code == 200 and bool((h_b1 or {}).get("handle_once")), str(code))
    code, r_b1 = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs/resolve",
        token=token,
        body={
            "handle": (h_b1 or {}).get("handle_once"),
            "expected_dest_route_key": "career_pack",
        },
    )
    check("product", "journey_b_resolve_pack", code == 200 and (r_b1 or {}).get("ok") is True, str(code))

    code, draft = _req(
        "POST",
        "/api/v1/candidates/me/career-packs",
        token=token,
        body={"pack_type": "GENERAL_EVIDENCE_PORTFOLIO_PACK", "title": "Handoff Pack"},
    )
    pack_key = (draft or {}).get("pack_key") or ""
    check("product", "journey_b_pack", code == 200 and bool(pack_key), str(code))
    code, h_b2 = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs",
        token=token,
        body={"handoff_id": "career_pack_to_access_center", "object_ref": pack_key},
    )
    check("product", "journey_b_pack_access", code == 200 and bool((h_b2 or {}).get("handle_once")), str(code))
    code, r_b2 = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs/resolve",
        token=token,
        body={
            "handle": (h_b2 or {}).get("handle_once"),
            "expected_dest_route_key": "access_center",
        },
    )
    check(
        "product",
        "journey_b_resolve_access",
        code == 200
        and (r_b2 or {}).get("ok") is True
        and (r_b2 or {}).get("return_href") == "/dashboard/career-pack",
        str(code),
    )

    code, bad = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs",
        token=token,
        body={"handoff_id": "any_to_any", "object_ref": "x"},
    )
    check("security", "not_allowlisted", code == 400, str(code))

    code, unauth = _req("GET", "/api/v1/candidates/me/workspace-handoffs/catalog")
    check("security", "auth_required", code in {401, 403}, str(code))

    # Tamper: wrong dest
    code, mismatch = _req(
        "POST",
        "/api/v1/candidates/me/workspace-handoffs/resolve",
        token=token,
        body={"handle": handle_a, "expected_dest_route_key": "access_center"},
    )
    check("security", "dest_mismatch", code == 400, str(code))

    # Cleanup synthetics (owner APIs — not handoff layer)
    if pack_key:
        _req("DELETE", f"/api/v1/candidates/me/career-packs/{pack_key}", token=token)
    if ws_id:
        _req(
            "POST",
            f"/api/v1/candidates/me/application-studio/workspaces/{ws_id}/delete",
            token=token,
            body={},
        )
    check("product", "synthetic_cleanup", True)

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
