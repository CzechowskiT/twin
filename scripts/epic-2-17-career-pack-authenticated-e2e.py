#!/usr/bin/env python3
"""Epic 2.17 — authenticated synthetic E2E (product + stance + canary invariant).

Never prints pack contents / PII. Never sends externally.
"""

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


def _req_bytes(method: str, path: str, *, token: str | None = None) -> tuple[int, int]:
    headers = {"Accept": "*/*"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            data = resp.read()
            return resp.status, len(data)
    except urllib.error.HTTPError as exc:
        _ = exc.read()
        return exc.code, 0


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

    code, _ = _req("GET", "/api/v1/candidates/me/career-packs/catalog")
    check("product", "unauth_blocked", code in {401, 403}, str(code))

    code, cat = _req("GET", "/api/v1/candidates/me/career-packs/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "schema",
        isinstance(cat, dict) and cat.get("schema_id") == "twin.candidate_career_pack/v1",
    )
    check(
        "product",
        "two_types",
        isinstance(cat, dict) and len(cat.get("pack_types") or []) == 2,
    )
    check(
        "product",
        "no_external",
        isinstance(cat, dict) and cat.get("external_delivery") is False,
    )
    check(
        "product",
        "no_llm",
        isinstance(cat, dict) and cat.get("llm_rewrite") is False,
    )
    check(
        "product",
        "not_first_value",
        isinstance(cat, dict) and cat.get("first_value_satisfied_by_career_pack") is False,
    )
    check(
        "product",
        "no_eighth_nav",
        isinstance(cat, dict) and cat.get("eighth_primary_nav") is False,
    )
    check(
        "product",
        "recipient_not_performed",
        isinstance(cat, dict) and cat.get("recipient_delivery") == "NOT_PERFORMED",
    )

    fields = {f["field_key"]: f for f in (cat.get("disclosure_fields") or [])} if isinstance(cat, dict) else {}
    check(
        "product",
        "sensitive_email_off",
        fields.get("contact_email", {}).get("sensitive") is True
        and fields.get("contact_email", {}).get("default_on") is False,
    )
    check(
        "product",
        "internal_not_selectable",
        fields.get("internal_notes", {}).get("selectable") is False,
    )

    code, arts = _req("GET", "/api/v1/candidates/me/career-packs/artifacts", token=token)
    check("product", "artifacts_200", code == 200 and isinstance(arts, dict), str(code))
    check(
        "product",
        "artifacts_not_fv",
        isinstance(arts, dict) and arts.get("first_value_satisfied") is False,
    )

    code, draft = _req(
        "POST",
        "/api/v1/candidates/me/career-packs",
        token=token,
        body={"pack_type": "GENERAL_EVIDENCE_PORTFOLIO_PACK", "title": "Synth Pack"},
    )
    check(
        "product",
        "create_draft",
        code == 200 and isinstance(draft, dict) and draft.get("state") == "DRAFT",
        str(code),
    )
    pack_key = (draft or {}).get("pack_key") or ""
    check("product", "create_not_fv", isinstance(draft, dict) and draft.get("first_value_satisfied") is False)

    refs = []
    for a in (arts or {}).get("artifacts") or []:
        if a.get("approved") or a.get("artifact_kind") == "career_evidence":
            refs.append(
                {
                    "artifact_kind": a["artifact_kind"],
                    "artifact_ref": a["artifact_ref"],
                }
            )
            break

    code, sel = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/selection",
        token=token,
        body={
            "artifact_refs": refs,
            "disclosure": {
                "display_name": True,
                "evidence_titles": True,
                "contact_email": False,
                "phone": False,
            },
        },
    )
    check(
        "product",
        "selection_ok",
        code == 200 and isinstance(sel, dict) and sel.get("disclosure", {}).get("contact_email") is False,
        str(code),
    )

    code, preview = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/preview",
        token=token,
        body={"stale_confirmed": True},
    )
    check(
        "product",
        "preview_awaiting",
        code == 200
        and isinstance(preview, dict)
        and preview.get("state") == "AWAITING_CONFIRMATION"
        and bool(preview.get("preview_hash")),
        str(code),
    )
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
        code == 200
        and isinstance(ready, dict)
        and ready.get("state") == "READY"
        and ready.get("immutable") is True
        and ready.get("first_value_satisfied") is False,
        str(code),
    )

    code, blen = _req_bytes(
        "GET",
        f"/api/v1/candidates/me/career-packs/{pack_key}/download?format=zip",
        token=token,
    )
    check("product", "download_zip", code == 200 and blen > 40, f"status={code} bytes={blen}")

    code, _ = _req_bytes(
        "GET",
        f"/api/v1/candidates/me/career-packs/{pack_key}/download?format=zip",
    )
    check("product", "download_unauth_blocked", code in {401, 403}, str(code))

    code, revoked = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/revoke",
        token=token,
    )
    check(
        "product",
        "revoke_ok",
        code == 200 and isinstance(revoked, dict) and revoked.get("state") == "REVOKED",
        str(code),
    )
    code, blen2 = _req_bytes(
        "GET",
        f"/api/v1/candidates/me/career-packs/{pack_key}/download?format=zip",
        token=token,
    )
    check("product", "download_after_revoke_blocked", code in {409, 400}, str(code))

    code, deleted = _req(
        "DELETE",
        f"/api/v1/candidates/me/career-packs/{pack_key}",
        token=token,
    )
    check(
        "product",
        "delete_ok",
        code == 200 and isinstance(deleted, dict) and deleted.get("deleted") is True,
        str(code),
    )

    # Explicit: no send endpoint
    code, _ = _req(
        "POST",
        f"/api/v1/candidates/me/career-packs/{pack_key}/send",
        token=token,
        body={},
    )
    check("product", "send_absent", code in {404, 405, 422}, str(code))

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
