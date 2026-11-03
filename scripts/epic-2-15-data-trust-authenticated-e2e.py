#!/usr/bin/env python3
"""Epic 2.15 — authenticated synthetic E2E (product + stance + canary invariant).

Never designates, never activates canary, never raises caps, never sends invites.
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

PRODUCT_PASS = 0
PRODUCT_FAIL = 0
STANCE_PASS = 0
STANCE_FAIL = 0
INVARIANT_PASS = 0
INVARIANT_FAIL = 0

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


def _multipart_upload(token: str, batch_key: str, content: bytes, filename: str):
    boundary = f"----twin{uuid.uuid4().hex}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Accept": "application/json",
    }
    req = urllib.request.Request(
        f"{API}/api/v1/candidates/me/import/batches/{batch_key}/upload",
        data=body,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as exc:
        raw = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:200]}


def _public_health() -> dict:
    req = urllib.request.Request(f"{FE}/api/public-health", method="GET")
    with urllib.request.urlopen(req, timeout=45, context=_CTX) as resp:
        return json.loads(resp.read().decode())


def _inv_snap(h: dict) -> dict:
    return {k: h.get(k) for k in INVARIANT_KEYS}


def main() -> int:
    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    before = _public_health()
    before_inv = _inv_snap(before)
    check("stance", "public_health", True, "before")
    check("stance", "launch_nogo", before.get("rc1_launch") == "NO-GO", "")
    check(
        "stance",
        "enrollment_off",
        before.get("rc1_external_pilot_enrollment_enabled") is False,
        "",
    )
    check(
        "stance",
        "canary_inactive",
        before.get("rc1_one_candidate_canary_active") is False,
        "",
    )
    check(
        "stance",
        "activation_prepared",
        before.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
        "",
    )
    check(
        "stance",
        "designation_count_0",
        int(before.get("rc1_real_canary_designation_count") or 0) == 0,
        "",
    )
    check(
        "stance",
        "caps_zero",
        int(before.get("rc1_effective_canary_cap") or 0) == 0
        and int(before.get("rc1_effective_cohort_cap") or 0) == 0,
        "",
    )

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    if not token:
        print("FAIL no token")
        return 1

    code, _ = _req("GET", "/api/v1/candidates/me/data-trust/catalog")
    check("product", "unauth_blocked", code in {401, 403}, str(code))

    code, cat = _req("GET", "/api/v1/candidates/me/data-trust/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_data_trust/v1",
        "",
    )
    check("product", "no_auto_repair", isinstance(cat, dict) and cat.get("auto_repair") is False, "")
    check(
        "product",
        "not_first_value",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_data_trust") is False,
        "",
    )
    check(
        "product",
        "no_eighth_nav",
        isinstance(cat, dict) and cat.get("eighth_primary_nav") is False,
        "",
    )

    # Import commit → spawn review
    code, batch = _req(
        "POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "document"}
    )
    bk = (batch.get("batch_key") if isinstance(batch, dict) else "") or ""
    _multipart_upload(token, bk, b"Data trust synth note\n\nExact conflict probe.\n", "synth.txt")
    code, prev = _req(f"POST", f"/api/v1/candidates/me/import/batches/{bk}/process", token=token)
    items = ((prev or {}).get("preview") or {}).get("items") or []
    keys = [it["item_key"] for it in items if isinstance(it, dict)]
    _req(
        "POST",
        f"/api/v1/candidates/me/import/batches/{bk}/approve",
        token=token,
        body={
            "item_keys": keys,
            "preview_version": (prev or {}).get("preview_version"),
            "idempotency_key": f"appr-{bk[:12]}",
        },
    )
    code, cmt = _req(
        "POST",
        f"/api/v1/candidates/me/import/batches/{bk}/commit",
        token=token,
        body={"idempotency_key": f"cmt-{bk[:12]}"},
    )
    check(
        "product",
        "import_committed",
        code == 200 and isinstance(cmt, dict) and cmt.get("state") == "COMMITTED",
        str(code),
    )

    code, reviews = _req("GET", "/api/v1/candidates/me/data-trust/reviews", token=token)
    check("product", "reviews_200", code == 200 and isinstance(reviews, dict), str(code))
    lst = (reviews or {}).get("reviews") or []
    check("product", "post_commit_review_spawned", len(lst) >= 1, str(len(lst)))
    rk = (lst[0].get("review_key") if lst else "") or ""

    code, detail = _req(f"GET", f"/api/v1/candidates/me/data-trust/reviews/{rk}", token=token)
    qs = (detail or {}).get("questions") or []
    check("product", "questions_present", code == 200 and len(qs) >= 1, str(len(qs)))
    check(
        "product",
        "review_not_first_value",
        isinstance(detail, dict) and detail.get("first_value_satisfied") is False,
        "",
    )

    for q in qs:
        _req(
            "POST",
            f"/api/v1/candidates/me/data-trust/reviews/{rk}/questions/{q['question_key']}/resolve",
            token=token,
            body={
                "resolution_action": (
                    "REPLACE_WITH_INCOMING"
                    if q.get("domain") in {"evidence", "skills", "profile"}
                    else "DISMISS"
                )
            },
        )

    code, prevw = _req(
        "POST", f"/api/v1/candidates/me/data-trust/reviews/{rk}/impact-preview", token=token
    )
    check(
        "product",
        "impact_preview_no_mutate",
        code == 200
        and isinstance(prevw, dict)
        and (prevw.get("impact_preview") or {}).get("mutates_on_preview") is False,
        str(code),
    )

    code, prop = _req(
        "POST", f"/api/v1/candidates/me/data-trust/reviews/{rk}/propose", token=token
    )
    check(
        "product",
        "propose_requires_approval",
        code == 200 and isinstance(prop, dict) and prop.get("requires_approval") is True,
        str(code),
    )
    cs_key = ((prop or {}).get("change_set") or {}).get("change_set_key") or ""

    code, appr = _req(
        "POST",
        f"/api/v1/candidates/me/data-trust/reviews/{rk}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check(
        "product",
        "approve_applied",
        code == 200
        and isinstance(appr, dict)
        and (appr.get("review") or {}).get("status") == "APPLIED",
        str(code),
    )
    check(
        "product",
        "approve_not_first_value",
        isinstance(appr, dict) and appr.get("first_value_satisfied") is False,
        "",
    )

    if cs_key:
        code, und = _req(
            "POST",
            f"/api/v1/candidates/me/data-trust/change-sets/{cs_key}/undo",
            token=token,
        )
        check(
            "product",
            "conflict_safe_undo",
            code == 200 and isinstance(und, dict) and und.get("undone") is True,
            str(code),
        )

    # Workspace search still read-only
    code, search = _req(
        "POST",
        "/api/v1/candidates/me/workspace-search",
        token=token,
        body={"q": "data-trust"},
    )
    check(
        "product",
        "search_mutations_0",
        code == 200 and isinstance(search, dict) and search.get("mutations") == 0,
        str((search or {}).get("mutations")),
    )

    after = _public_health()
    after_inv = _inv_snap(after)
    diffs = {k: (before_inv[k], after_inv[k]) for k in INVARIANT_KEYS if before_inv[k] != after_inv[k]}
    check("invariant", "business_state_diff_0", len(diffs) == 0, json.dumps(diffs)[:200])
    check(
        "invariant",
        "canary_still_ready_inactive",
        after.get("rc1_one_candidate_canary_state") == "READY_INACTIVE"
        and after.get("rc1_one_candidate_canary_active") is False,
        "",
    )
    check(
        "invariant",
        "designation_still_0",
        int(after.get("rc1_real_canary_designation_count") or 0) == 0,
        "",
    )
    check(
        "invariant",
        "activation_still_prepared",
        after.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
        "",
    )

    print(
        f"\nproduct {PRODUCT_PASS}/{PRODUCT_PASS + PRODUCT_FAIL} "
        f"stance {STANCE_PASS}/{STANCE_PASS + STANCE_FAIL} "
        f"invariant {INVARIANT_PASS}/{INVARIANT_PASS + INVARIANT_FAIL}"
    )
    return 0 if (PRODUCT_FAIL + STANCE_FAIL + INVARIANT_FAIL) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
