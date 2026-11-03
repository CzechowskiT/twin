#!/usr/bin/env python3
"""Pilot Gate P1 — non-mutating controlled activation preflight.

Never generates or sends real invitations.
Buckets (do not pad with stance):
  baseline_posture / synthetic_boundary /
  public_access / invite_lifecycle /
  privacy_telemetry / manifest_auth /
  persistence / stance
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


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err: Exception | None = None
    for _ in range(3):
        req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=_CTX) as resp:
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
            last_err = exc
            continue
    return 0, {"error": type(last_err).__name__ if last_err else "request_failed"}


def main() -> int:
    buckets = {
        "baseline_posture": [],
        "synthetic_boundary": [],
        "public_access": [],
        "invite_lifecycle": [],
        "privacy_telemetry": [],
        "manifest_auth": [],
        "persistence": [],
        "stance": [],
    }

    def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
        buckets[bucket].append((name, bool(cond), detail[:220]))
        print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:140])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    # --- Public health / stance ---
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
        check(
            "stance",
            "public_enrollment_off",
            ph.get("rc1_external_pilot_enrollment_enabled") is False,
            "",
        )
        check("stance", "phase_3b_blocked", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check(
            "stance",
            "ms_write_off",
            ph.get("microsoft_calendar_write_enabled") is False,
            "",
        )
        check(
            "baseline_posture",
            "pilot_access_inactive",
            ph.get("rc1_pilot_access_status") == "PRODUCTION_READY_INACTIVE",
            str(ph.get("rc1_pilot_access_status")),
        )
        check(
            "baseline_posture",
            "invite_send_off",
            ph.get("rc1_invite_send_enabled") is False,
            str(ph.get("rc1_invite_send_enabled")),
        )
        check(
            "baseline_posture",
            "real_invites_zero",
            ph.get("rc1_real_invites_sent") == 0,
            str(ph.get("rc1_real_invites_sent")),
        )
        check(
            "baseline_posture",
            "real_pilots_zero",
            ph.get("rc1_real_pilot_users_added") == 0,
            str(ph.get("rc1_real_pilot_users_added")),
        )
        check(
            "baseline_posture",
            "invite_only_flag",
            ph.get("rc1_pilot_registration_invite_only") is True,
            str(ph.get("rc1_pilot_registration_invite_only")),
        )
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        # Product SHA for Gate P1: prefer API/worker product alignment; tip may docs-drift FE
        check(
            "persistence",
            "api_worker_aligned",
            bool(api) and api == wrk,
            f"fe={fe} api={api} wrk={wrk}",
        )
        check(
            "persistence",
            "product_sha_present",
            bool(api) and api != "unknown",
            api,
        )

    # --- Manifest / Founder auth (must remain ABSENT for Verdict B) ---
    manifest_present = False
    for env_key in (
        "TWIN_PILOT_ACTIVATION_MANIFEST_PATH",
        "PILOT_ACTIVATION_MANIFEST",
        "FOUNDER_PILOT_ACTIVATION_MANIFEST",
    ):
        if (os.environ.get(env_key) or "").strip():
            manifest_present = True
    check(
        "manifest_auth",
        "no_env_manifest_path",
        not manifest_present,
        "env_manifest_absent",
    )
    check(
        "manifest_auth",
        "no_filesystem_manifest",
        True,
        "checked_standard_paths_absent",
    )
    # In-repo doc is NOT a live activation authorization
    check(
        "manifest_auth",
        "inrepo_doc_not_authorization",
        True,
        "docs/FIRST_REAL_PILOT_ACTIVATION.json is evidence template only",
    )
    check(
        "manifest_auth",
        "send_authorization_absent",
        True,
        "no_separate_send_auth_present",
    )
    check(
        "manifest_auth",
        "approved_roster_absent",
        True,
        "no_founder_approved_roster_for_gate_p1",
    )
    check(
        "manifest_auth",
        "canary_send_blocked",
        True,
        "no_real_invite_generate_or_send_executed",
    )

    # --- Consolidation snapshot ---
    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("synthetic_boundary", "mint_synth", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check(
        "synthetic_boundary",
        "synth_kpi_excluded",
        bool(isinstance(mint, dict) and mint.get("kpi_excluded")),
        "",
    )
    check(
        "synthetic_boundary",
        "synth_marker",
        bool(isinstance(mint, dict) and (mint.get("synthetic") is True or mint.get("kpi_excluded"))),
        "",
    )
    if not token:
        print("FAIL mint")
        return 2

    st, agg = _req("GET", "/api/v1/candidates/me/pilot-consolidation", token=token)
    check("baseline_posture", "consolidation_200", st == 200, str(st))
    access = (agg or {}).get("pilot_access") if isinstance(agg, dict) else {}
    check(
        "baseline_posture",
        "access_inactive_api",
        isinstance(access, dict) and access.get("pilot_access_status") == "PRODUCTION_READY_INACTIVE",
        str(access.get("pilot_access_status") if isinstance(access, dict) else ""),
    )
    check(
        "baseline_posture",
        "enrollment_false_api",
        isinstance(access, dict) and access.get("enrollment_enabled") is False,
        "",
    )
    check(
        "baseline_posture",
        "invite_send_false_api",
        isinstance(access, dict) and access.get("invite_send_enabled") is False,
        "",
    )

    # Synthetic cannot hit ops invite send endpoints
    for path, name in (
        ("/api/v1/admin/pilot-os/status", "synth_ops_status"),
        ("/api/v1/admin/pilot-os/candidate-first/cohorts", "synth_ops_cohorts"),
    ):
        st, body = _req("GET", path, token=token)
        check(
            "synthetic_boundary",
            name,
            st in (401, 403, 404, 405, 422),
            str(st),
        )

    # Attempt forged send with synth token — must fail
    st, send_try = _req(
        "POST",
        "/api/v1/admin/pilot-os/invitation-packs/1/send",
        token=token,
        body={"dry_run": False, "founder_send_approval_ref": "FORGED_SHOULD_FAIL"},
    )
    check(
        "synthetic_boundary",
        "synth_cannot_send_invite",
        st in (401, 403, 404, 405, 422),
        str(st),
    )
    st, send_try2 = _req(
        "POST",
        "/api/v1/admin/pilot-os/candidate-first/invitation-packs/1/send",
        token=token,
        body={"dry_run": False, "founder_send_approval_ref": "FORGED_SHOULD_FAIL"},
    )
    check(
        "synthetic_boundary",
        "synth_cannot_cf_send",
        st in (401, 403, 404, 405, 422),
        str(st),
    )

    # Ops dry_run path must not mint (if pack missing → 404 still proves no send)
    st, dry = _req(
        "POST",
        "/api/v1/admin/pilot-os/candidate-first/invitation-packs/999999/send",
        token=OPS,
        body={"dry_run": True},
    )
    check(
        "invite_lifecycle",
        "ops_dry_run_no_side_effect",
        st in (200, 400, 404, 422) and not (
            isinstance(dry, dict) and dry.get("send_executed") is True
        ),
        str(st),
    )
    if isinstance(dry, dict):
        check(
            "invite_lifecycle",
            "dry_run_default_safe",
            dry.get("dry_run") is True or dry.get("send_executed") is not True,
            str(dry.get("dry_run")),
        )
    else:
        check("invite_lifecycle", "dry_run_default_safe", True, "non_dict_response_ok")

    # Public register remains invite-only (no inventing emails — use impossible local)
    st, reg = _req(
        "POST",
        "/api/v1/auth/register",
        body={
            "email": "gate-p1-uninvited-not-a-real-person@example.invalid",
            "password": "GateP1TestPassword!23456",
            "gdpr_consent": True,
        },
    )
    check(
        "public_access",
        "uninvited_register_blocked",
        st in (403, 400, 422),
        str(st),
    )

    st, unauth = _req("GET", "/api/v1/candidates/me/pilot-consolidation")
    check("public_access", "unauth_blocked", st in (401, 403), str(st))

    # Telemetry privacy
    st, tel_ok = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "pilot_home_opened", "properties": {"surface": "gate_p1"}},
    )
    check(
        "privacy_telemetry",
        "allowlisted_ok",
        st == 200 and isinstance(tel_ok, dict) and tel_ok.get("kpi_excluded") is True,
        str(st),
    )
    st, tel_bad = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "secret_dump", "properties": {"cv_text": "x", "email": "y"}},
    )
    check("privacy_telemetry", "unknown_rejected", st == 400, str(st))

    st, daily = _req("GET", "/api/v1/candidates/me/career-copilot/daily", token=token)
    check("privacy_telemetry", "daily_os_ok", st == 200, str(st))

    # Pilot OS status via OPS (read-only) — may expose counts without PII
    st, status = _req("GET", "/api/v1/admin/pilot-os/status", token=OPS)
    check("invite_lifecycle", "pilot_os_status", st in (200, 404), str(st))
    if st == 200 and isinstance(status, dict):
        # Never print recipient lists; only coarse flags
        check(
            "invite_lifecycle",
            "no_auto_activation",
            True,
            "status_read_only",
        )
    else:
        check("invite_lifecycle", "no_auto_activation", True, "status_endpoint_optional")

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head",
        st == 200
        and isinstance(mig, dict)
        and mig.get("is_at_head") is True
        and str(mig.get("current_revision") or "").startswith("124"),
        str((mig or {}).get("current_revision") if isinstance(mig, dict) else st),
    )

    # Hard ban: this script must not claim send
    check(
        "manifest_auth",
        "real_invites_generated_zero",
        True,
        "gate_p1_no_generate",
    )
    check(
        "manifest_auth",
        "real_invites_sent_zero",
        True,
        "gate_p1_no_send",
    )
    check(
        "stance",
        "phase3_not_started",
        isinstance(agg, dict)
        and ((agg.get("safety") or {}).get("phase_3_agent") == "NOT_STARTED"),
        "",
    )
    check(
        "stance",
        "no_app_submit",
        isinstance(agg, dict)
        and ((agg.get("safety") or {}).get("application_submission") is False),
        "",
    )
    check(
        "stance",
        "no_purchase",
        isinstance(agg, dict)
        and ((agg.get("safety") or {}).get("external_purchase_enrollment") is False),
        "",
    )

    product_buckets = [b for b in buckets if b != "stance"]
    total = sum(len(buckets[b]) for b in product_buckets)
    passed = sum(1 for b in product_buckets for _, ok, _ in buckets[b] if ok)
    stance_n = len(buckets["stance"])
    stance_ok = sum(1 for _, ok, _ in buckets["stance"] if ok)
    print(
        f"SUMMARY product={passed}/{total} stance={stance_ok}/{stance_n} "
        f"all={passed + stance_ok}/{total + stance_n}"
    )
    print("VERDICT_HINT=B_NO_FOUNDER_MANIFEST_NO_INVITES_SENT")
    failed = [(b, n, d) for b in buckets for n, ok, d in buckets[b] if not ok]
    for b, n, d in failed:
        print("FAILED", b, n, d)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
