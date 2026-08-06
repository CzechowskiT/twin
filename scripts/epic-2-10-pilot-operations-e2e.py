#!/usr/bin/env python3
"""Epic 2.10 authenticated synthetic E2E — never generates/sends real invites."""

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
except Exception:
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120, context=_CTX) as resp:
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
    except Exception as exc:
        return 0, {"error": type(exc).__name__}


def main() -> int:
    buckets = {
        "runtime_caps": [],
        "support_loop": [],
        "ops_gates": [],
        "stance": [],
    }

    def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
        buckets[bucket].append((name, bool(cond), detail[:200]))
        print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:120])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    try:
        with urllib.request.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
    except Exception as exc:
        ph = {}
        check("stance", "public_health", False, str(exc))
    else:
        check("stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", "")
        check("stance", "enrollment_off", ph.get("rc1_external_pilot_enrollment_enabled") is False, "")
        check("stance", "invite_send_off", ph.get("rc1_invite_send_enabled") is False, "")
        check("stance", "real_invites_zero", ph.get("rc1_real_invites_sent") == 0, str(ph.get("rc1_real_invites_sent")))
        check(
            "stance",
            "access_ready_inactive",
            ph.get("rc1_pilot_access_status") in (
                "OPERATIONALLY_READY_INACTIVE",
                "PRODUCTION_READY_INACTIVE",
            ),
            str(ph.get("rc1_pilot_access_status")),
        )
        check("stance", "phase_3b", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check("stance", "ms_write_off", ph.get("microsoft_calendar_write_enabled") is False, "")

    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("runtime_caps", "mint_synth", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("runtime_caps", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        return 2

    st, agg = _req("GET", "/api/v1/candidates/me/pilot-operations", token=token)
    check("runtime_caps", "ops_aggregate", st == 200, str(st))
    if isinstance(agg, dict):
        rt = agg.get("runtime") or {}
        check(
            "runtime_caps",
            "state_ready_inactive",
            rt.get("state") == "OPERATIONALLY_READY_INACTIVE",
            str(rt.get("state")),
        )
        caps = agg.get("hard_caps") or {}
        eff = caps.get("effective") or {}
        check("runtime_caps", "eff_cohort_0", eff.get("real_cohort") == 0, str(eff))
        check("runtime_caps", "eff_canary_0", eff.get("canary") == 0, str(eff))
        check("runtime_caps", "eff_gen_0", eff.get("generation") == 0, str(eff))
        check("runtime_caps", "eff_send_0", eff.get("send") == 0, str(eff))
        safety = agg.get("safety") or {}
        check("stance", "gen_off", safety.get("real_invite_generation") == "OFF", "")
        check("stance", "redeem_off", safety.get("real_invite_redemption") == "OFF", "")

    st, help_b = _req("GET", "/api/v1/candidates/me/pilot-operations/help?locale=en", token=token)
    check("support_loop", "help_en", st == 200 and isinstance(help_b, dict) and bool(help_b.get("articles")), str(st))

    st, prev = _req(
        "POST",
        "/api/v1/candidates/me/pilot-operations/diagnostic/preview",
        token=token,
        body={
            "diagnostic_opt_in": True,
            "diagnostic": {"surface": "e2e", "email": "x@y.z", "route": "/dashboard/help"},
        },
    )
    check(
        "support_loop",
        "diag_reject_email",
        st == 200 and "email" not in ((prev or {}).get("included") or {}),
        str(st),
    )

    st, prob = _req(
        "POST",
        "/api/v1/candidates/me/pilot-operations/problems",
        token=token,
        body={
            "category": "daily_os",
            "subject": "Synthetic e2e problem",
            "body_text": "No real invite path",
            "diagnostic_opt_in": False,
            "locale": "en",
        },
    )
    check("support_loop", "problem_submit", st == 200, str(st))

    st, fb = _req(
        "POST",
        "/api/v1/candidates/me/pilot-operations/feedback",
        token=token,
        body={"category": "ux", "message": "Synthetic feedback", "rating": 4},
    )
    check("support_loop", "feedback_submit", st == 200, str(st))
    fid = ((fb or {}).get("feedback") or {}).get("id") if isinstance(fb, dict) else None
    if fid:
        st, wd = _req(
            "POST",
            f"/api/v1/candidates/me/pilot-operations/feedback/{fid}/withdraw",
            token=token,
            body={},
        )
        check("support_loop", "feedback_withdraw", st == 200, str(st))
    else:
        check("support_loop", "feedback_withdraw", False, "no_id")

    st, man = _req(
        "POST",
        "/api/v1/admin/pilot-operations/manifest/validate-dry-run",
        token=OPS,
        body={"manifest": {"unique_id": "x"}},
    )
    check(
        "ops_gates",
        "manifest_dry_run",
        st == 200 and (man or {}).get("mutates_state") is False and (man or {}).get("valid") is False,
        str(st),
    )

    st, dec = _req(
        "POST",
        "/api/v1/admin/pilot-operations/decisions/dry-run",
        token=OPS,
        body={"decision": "ACTIVATE", "target_state": "ACTIVE_INVITE_ONLY"},
    )
    check(
        "ops_gates",
        "activate_blocked",
        st == 200 and (dec or {}).get("mutates_state") is False and (dec or {}).get("allowed") is False,
        str(st),
    )

    st, inc = _req(
        "POST",
        "/api/v1/admin/pilot-operations/incident/synthetic-exercise",
        token=OPS,
        body={},
    )
    check(
        "ops_gates",
        "incident_synth",
        st == 200 and (inc or {}).get("mutates_state") is False,
        str(st),
    )

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "ops_gates",
        "db_head",
        st == 200
        and isinstance(mig, dict)
        and mig.get("is_at_head") is True
        and str(mig.get("current_revision") or "").startswith("125"),
        str((mig or {}).get("current_revision") if isinstance(mig, dict) else st),
    )

    # Prove no real invite send via synth token
    st, forged = _req(
        "POST",
        "/api/v1/admin/pilot-os/candidate-first/invitation-packs/1/send",
        token=token,
        body={"dry_run": False, "founder_send_approval_ref": "FORGED"},
    )
    check("runtime_caps", "synth_cannot_send", st in (401, 403, 404, 422), str(st))

    product = [b for b in buckets if b != "stance"]
    total = sum(len(buckets[b]) for b in product)
    passed = sum(1 for b in product for _, ok, _ in buckets[b] if ok)
    stance_n = len(buckets["stance"])
    stance_ok = sum(1 for _, ok, _ in buckets["stance"] if ok)
    print(f"SUMMARY product={passed}/{total} stance={stance_ok}/{stance_n} all={passed+stance_ok}/{total+stance_n}")
    failed = [(b, n, d) for b in buckets for n, ok, d in buckets[b] if not ok]
    for b, n, d in failed:
        print("FAILED", b, n, d)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
