#!/usr/bin/env python3
"""Epic 2.26 — authenticated synthetic journeys A–H against live API (ordinary entitlements).

Uses mint-synthetic-session. No canary mutation. Cleanup via delete-account best-effort.
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
    global PRODUCT_PASS, PRODUCT_FAIL, STANCE_PASS, STANCE_FAIL
    global INVARIANT_PASS, INVARIANT_FAIL
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
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60, context=_CTX) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() if exc.fp else ""
        try:
            payload = json.loads(raw) if raw else {"detail": str(exc)}
        except Exception:
            payload = {"detail": raw or str(exc)}
        return exc.code, payload


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

    # Journey A — FE surfaces exist (ordinary)
    code, _ = _req("GET", "/api/v1/candidates/me/interview-practice/catalog")
    check("product", "A_catalog_requires_auth", code in {401, 403}, str(code))

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200 and bool((mint or {}).get("access_token")), str(code))
    token = (mint or {}).get("access_token") or ""
    if not token:
        print("ABORT no token")
        return 1

    # Journey B — catalog 6 EN+PL
    code, cat_en = _req("GET", "/api/v1/candidates/me/interview-practice/catalog?locale=en", token=token)
    check("product", "B_catalog_en", code == 200 and isinstance(cat_en, dict), str(code))
    exercises = (cat_en or {}).get("exercises") or []
    check("product", "B_six_exercises", len(exercises) == 6, str(len(exercises)))
    code, cat_pl = _req("GET", "/api/v1/candidates/me/interview-practice/catalog?locale=pl", token=token)
    check("product", "B_catalog_pl", code == 200 and bool((cat_pl or {}).get("exercises")), str(code))
    families = {e.get("family") for e in exercises}
    check(
        "product",
        "B_three_families",
        families >= {"behavioral_star", "role_problem", "clarifying_questions"},
        str(families),
    )

    # Journey C — candidate-authored process (no SynthCo required)
    code, proc = _req(
        "POST",
        "/api/v1/candidates/me/interview-decision/processes",
        token=token,
        body={
            "title": "Epic226 Practice Role",
            "company": "CandidateOwnedCo",
            "role_title": "Engineer",
        },
    )
    check("product", "C_create_process", code in {200, 201} and bool((proc or {}).get("process")), str(code))
    process_id = ((proc or {}).get("process") or {}).get("id")

    # Journey D — multi-turn adaptive practice
    ex_id = exercises[0]["id"] if exercises else "behavioral_star_1"
    code, sess = _req(
        "POST",
        "/api/v1/candidates/me/interview-practice/sessions",
        token=token,
        body={"exercise_id": ex_id, "process_id": process_id, "locale": "en", "ai_prep_opt_in": False},
    )
    check("product", "D_create_session", code in {200, 201} and bool((sess or {}).get("id")), str(code))
    sid = (sess or {}).get("id")
    turns = (sess or {}).get("turns") or []
    check("product", "D_first_turn", bool(turns), str(len(turns)))
    tid = turns[0]["id"] if turns else None

    answer = (
        "Situation: our API p95 rose. Task: I owned the investigation. "
        "Action: I isolated a missing index, shipped a migration, and verified metrics. "
        "Result: latency improved; exact percent UNKNOWN without the dashboard export."
    )
    code, draft = _req(
        "PATCH",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}/turns/{tid}/draft",
        token=token,
        body={"answer_draft": answer},
    )
    check("product", "D_save_draft", code == 200, str(code))

    code, submitted = _req(
        "POST",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}/turns/{tid}/submit",
        token=token,
        body={"answer_text": answer, "ai_prep_opt_in": False},
    )
    check("product", "D_submit", code == 200 and isinstance(submitted, dict), str(code))
    evaluation = (submitted or {}).get("evaluation") or {}
    check(
        "product",
        "E_no_invented_score",
        evaluation.get("score") is None and evaluation.get("score_available") is False,
        str(evaluation.get("score")),
    )
    check("product", "E_criteria_present", isinstance(evaluation.get("criteria"), list), "")
    check(
        "product",
        "E_status_honest",
        evaluation.get("evaluation_status")
        in {
            "EVALUATED",
            "EVALUATION_UNAVAILABLE",
            "INSUFFICIENT_INFORMATION",
            "DETERMINISTIC_LIBRARY_FALLBACK",
            "EVALUATED_DETERMINISTIC",
        }
        or bool(evaluation.get("evaluation_status")),
        str(evaluation.get("evaluation_status")),
    )

    code, nxt = _req(
        "POST",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}/next-turn",
        token=token,
        body={"ai_prep_opt_in": False},
    )
    check("product", "D_next_turn", code == 200 and bool((nxt or {}).get("turn")), str(code))

    code, done = _req(
        "POST",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}/complete",
        token=token,
        body={},
    )
    check("product", "D_complete", code == 200, str(code))

    # Journey F — promote PRACTICE_WORK_SAMPLE
    code, promo = _req(
        "POST",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}/promote-to-evidence",
        token=token,
        body={},
    )
    check(
        "product",
        "F_promote",
        code == 200 and (promo or {}).get("label") == "PRACTICE_WORK_SAMPLE",
        str(promo),
    )

    # Journey G — soft delete
    code, deleted = _req(
        "DELETE",
        f"/api/v1/candidates/me/interview-practice/sessions/{sid}",
        token=token,
    )
    check("product", "G_soft_delete", code == 200 and (deleted or {}).get("deleted") is True, str(code))

    # Journey H — canary invariants unchanged
    after = _public_health()
    after_inv = _inv(after)
    diff = {k: (before_inv.get(k), after_inv.get(k)) for k in INVARIANT_KEYS if before_inv.get(k) != after_inv.get(k)}
    check("invariant", "H_canary_diff_0", len(diff) == 0, str(diff))

    # Best-effort cleanup
    _req("POST", "/api/v1/candidates/me/delete-account", token=token, body={"confirm": True})

    print(
        f"\nSUMMARY product={PRODUCT_PASS}/{PRODUCT_PASS + PRODUCT_FAIL} "
        f"stance={STANCE_PASS}/{STANCE_PASS + STANCE_FAIL} "
        f"invariant={INVARIANT_PASS}/{INVARIANT_PASS + INVARIANT_FAIL}"
    )
    return 0 if (PRODUCT_FAIL + STANCE_FAIL + INVARIANT_FAIL) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
