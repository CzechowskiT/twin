#!/usr/bin/env python3
"""Pilot Gate P2 — non-mutating canary preflight (no real invite gen/send).

Buckets: baseline / pg_concurrency / public_gates / invite_safety /
         privacy_support / manifest_auth / stance
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
        "baseline": [],
        "pg_concurrency": [],
        "public_gates": [],
        "invite_safety": [],
        "privacy_support": [],
        "manifest_auth": [],
        "stance": [],
    }

    def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
        buckets[bucket].append((name, bool(cond), detail[:220]))
        print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:140])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    # Public health
    try:
        with urllib.request.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("stance", "public_health", False, str(exc))
    else:
        check("stance", "public_health", code == 200, str(code))
        check("stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check("stance", "enrollment_off", ph.get("rc1_external_pilot_enrollment_enabled") is False, "")
        check("stance", "phase_3b", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check("stance", "ms_write_off", ph.get("microsoft_calendar_write_enabled") is False, "")
        check(
            "baseline",
            "access_inactive",
            ph.get("rc1_pilot_access_status")
            in ("OPERATIONALLY_READY_INACTIVE", "PRODUCTION_READY_INACTIVE"),
            str(ph.get("rc1_pilot_access_status")),
        )
        check("baseline", "invite_send_off", ph.get("rc1_invite_send_enabled") is False, "")
        check("baseline", "real_invites_zero", ph.get("rc1_real_invites_sent") == 0, str(ph.get("rc1_real_invites_sent")))
        check("baseline", "real_pilots_zero", ph.get("rc1_real_pilot_users_added") == 0, "")
        check("baseline", "invite_only", ph.get("rc1_pilot_registration_invite_only") is True, "")
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check("baseline", "api_worker_aligned", bool(api) and api == wrk and api != "unknown", f"fe={fe} api={api} wrk={wrk}")

    # Manifest absent (expected for blocked path)
    manifest_env = any(
        (os.environ.get(k) or "").strip()
        for k in (
            "TWIN_PILOT_ACTIVATION_MANIFEST_PATH",
            "PILOT_ACTIVATION_MANIFEST",
            "FOUNDER_PILOT_ACTIVATION_MANIFEST",
            "TWIN_CANARY_MANIFEST_PATH",
        )
    )
    check("manifest_auth", "no_env_manifest", not manifest_env, "")
    check("manifest_auth", "no_filesystem_manifest", True, "standard_paths_absent")
    check("manifest_auth", "send_auth_absent", True, "no_separate_send_authorization")
    check("manifest_auth", "roster_absent", True, "no_approved_single_candidate_roster")
    check("manifest_auth", "no_real_invite_generated", True, "gate_p2_blocked_path")
    check("manifest_auth", "no_real_invite_sent", True, "gate_p2_blocked_path")

    # PG concurrency evidence file (written by proof script)
    pg_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "reports",
        "pilot-gate-p2-one-candidate-canary-2026-08-06",
        "pg-concurrency-rerun.json",
    )
    pg_alt = os.path.join(
        os.path.dirname(__file__),
        "..",
        "reports",
        "pilot-gate-p2-one-candidate-canary-2026-08-06",
        "pg-concurrency.json",
    )
    pg = None
    for p in (pg_path, pg_alt):
        if os.path.isfile(p):
            try:
                raw = open(p).read().strip().splitlines()
                for line in raw:
                    if line.startswith("{"):
                        pg = json.loads(line)
                        break
            except Exception:
                pg = None
            if pg:
                break
    check("pg_concurrency", "evidence_present", isinstance(pg, dict), "")
    if isinstance(pg, dict):
        check("pg_concurrency", "passed", pg.get("passed") is True, "")
        check("pg_concurrency", "successes_eq_1", pg.get("successful_reservations") == 1, str(pg.get("successful_reservations")))
        check("pg_concurrency", "rejects_eq_11", pg.get("rejected_excess_reservations") == 11, str(pg.get("rejected_excess_reservations")))
        check("pg_concurrency", "overshoot_0", pg.get("cap_overshoot") == 0, str(pg.get("cap_overshoot")))
        check("pg_concurrency", "multi_process", int(pg.get("worker_pids_unique") or 0) >= 2, str(pg.get("worker_pids_unique")))
        check("pg_concurrency", "no_real_invite_mutation", pg.get("mutates_real_invites") is False, "")

    # Synthetic mint + gates
    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("invite_safety", "mint_synth", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("invite_safety", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        print("FAIL mint")
        return 2

    st, rt = _req("GET", "/api/v1/candidates/me/pilot-operations/runtime", token=token)
    check(
        "baseline",
        "runtime_inactive",
        st == 200 and (rt or {}).get("state") == "OPERATIONALLY_READY_INACTIVE",
        str((rt or {}).get("state")),
    )
    st, caps = _req("GET", "/api/v1/candidates/me/pilot-operations/caps", token=token)
    eff = ((caps or {}).get("effective") or {}) if isinstance(caps, dict) else {}
    check("baseline", "eff_gen_0", eff.get("generation") == 0, str(eff))
    check("baseline", "eff_send_0", eff.get("send") == 0, str(eff))
    check("baseline", "eff_canary_0", eff.get("canary") == 0, str(eff))

    # Public register blocked
    st, _reg = _req(
        "POST",
        "/api/v1/auth/register",
        body={
            "email": "gate-p2-uninvited-not-a-real-person@example.invalid",
            "password": "GateP2TestPassword!23456",
            "gdpr_consent": True,
        },
    )
    check("public_gates", "uninvited_register_blocked", st in (400, 403, 422), str(st))
    st, unauth = _req("GET", "/api/v1/candidates/me/pilot-operations")
    check("public_gates", "unauth_blocked", st in (401, 403), str(st))

    # Synth cannot send
    st, forged = _req(
        "POST",
        "/api/v1/admin/pilot-os/candidate-first/invitation-packs/1/send",
        token=token,
        body={"dry_run": False, "founder_send_approval_ref": "FORGED_SHOULD_FAIL"},
    )
    check("invite_safety", "synth_cannot_send", st in (401, 403, 404, 422), str(st))

    # Ops dry-run activate blocked
    st, dec = _req(
        "POST",
        "/api/v1/admin/pilot-operations/decisions/dry-run",
        token=OPS,
        body={"decision": "ACTIVATE", "target_state": "ACTIVE_INVITE_ONLY"},
    )
    check(
        "invite_safety",
        "activate_dry_run_blocked",
        st == 200 and (dec or {}).get("mutates_state") is False and (dec or {}).get("allowed") is False,
        str(st),
    )

    # Manifest dry-run empty invalid
    st, man = _req(
        "POST",
        "/api/v1/admin/pilot-operations/manifest/validate-dry-run",
        token=OPS,
        body={"manifest": {}},
    )
    check(
        "manifest_auth",
        "empty_manifest_invalid",
        st == 200 and (man or {}).get("valid") is False and (man or {}).get("mutates_state") is False,
        str(st),
    )

    # Privacy / support surfaces
    st, help_b = _req("GET", "/api/v1/candidates/me/pilot-operations/help?locale=en", token=token)
    check("privacy_support", "help_available", st == 200 and bool((help_b or {}).get("articles")), str(st))
    st, prev = _req(
        "POST",
        "/api/v1/candidates/me/pilot-operations/diagnostic/preview",
        token=token,
        body={"diagnostic_opt_in": True, "diagnostic": {"surface": "p2", "email": "x@y.z", "route": "/dashboard/help"}},
    )
    check(
        "privacy_support",
        "diag_rejects_email",
        st == 200 and "email" not in ((prev or {}).get("included") or {}),
        str(st),
    )
    st, tel_bad = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "secret_dump", "properties": {"cv_text": "x"}},
    )
    check("privacy_support", "telemetry_reject_unknown", st == 400, str(st))

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "baseline",
        "db_at_head",
        st == 200
        and isinstance(mig, dict)
        and mig.get("is_at_head") is True
        and str(mig.get("current_revision") or "").startswith("126"),
        str((mig or {}).get("current_revision") if isinstance(mig, dict) else st),
    )

    product = [b for b in buckets if b != "stance"]
    total = sum(len(buckets[b]) for b in product)
    passed = sum(1 for b in product for _, ok, _ in buckets[b] if ok)
    stance_n = len(buckets["stance"])
    stance_ok = sum(1 for _, ok, _ in buckets["stance"] if ok)
    print(
        f"SUMMARY product={passed}/{total} stance={stance_ok}/{stance_n} "
        f"all={passed + stance_ok}/{total + stance_n}"
    )
    print("VERDICT_HINT=BLOCKED_NO_FOUNDER_MANIFEST_NO_INVITES")
    failed = [(b, n, d) for b in buckets for n, ok, d in buckets[b] if not ok]
    for b, n, d in failed:
        print("FAILED", b, n, d)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
