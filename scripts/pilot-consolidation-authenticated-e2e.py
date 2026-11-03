#!/usr/bin/env python3
"""Epic 2.9 fresh-account synthetic E2E — private pilot readiness (INACTIVE).

Buckets (do not pad with stance):
  journey_access / first_value /
  ia_home / telemetry_privacy /
  invite_inactive / deletion_security /
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
DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"


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
        "journey_access": [],
        "first_value": [],
        "ia_home": [],
        "telemetry_privacy": [],
        "invite_inactive": [],
        "deletion_security": [],
        "persistence": [],
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
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("stance", "public_health", False, str(exc))
    else:
        check("stance", "public_health", code == 200, str(code))
        check("stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check(
            "stance",
            "enrollment_off",
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
            "invite_inactive",
            "pilot_access_inactive",
            ph.get("rc1_pilot_access_status")
            in ("OPERATIONALLY_READY_INACTIVE", "PRODUCTION_READY_INACTIVE"),
            str(ph.get("rc1_pilot_access_status")),
        )
        check(
            "invite_inactive",
            "invite_send_off",
            ph.get("rc1_invite_send_enabled") is False,
            str(ph.get("rc1_invite_send_enabled")),
        )
        check(
            "invite_inactive",
            "real_invites_zero",
            ph.get("rc1_real_invites_sent") == 0,
            str(ph.get("rc1_real_invites_sent")),
        )
        check(
            "invite_inactive",
            "real_pilots_zero",
            ph.get("rc1_real_pilot_users_added") == 0,
            str(ph.get("rc1_real_pilot_users_added")),
        )
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check(
            "persistence",
            "four_way_aligned",
            fe == api == wrk and bool(fe),
            f"fe={fe} api={api} wrk={wrk}",
        )

    # Fresh synthetic session (kpi_excluded) — isolated mint
    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("deletion_security", "mint_fresh", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("deletion_security", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        print("FAIL mint", st, str(mint)[:200])
        return 2

    # Privacy orientation via lifecycle (optional)
    st, priv = _req(
        "PATCH",
        "/api/v1/candidates/me/career-lifecycle/privacy",
        token=token,
        body={
            "paused": False,
            "orchestration_opt_in": True,
            "search_opt_in": True,
            "learning_opt_in": True,
            "reminders_opt_in": True,
        },
    )
    check("journey_access", "privacy_orient", st in (200, 201), str(st))

    st, agg = _req("GET", "/api/v1/candidates/me/pilot-consolidation", token=token)
    check("journey_access", "consolidation_200", st == 200, str(st))
    check(
        "invite_inactive",
        "access_status",
        isinstance(agg, dict)
        and ((agg.get("pilot_access") or {}).get("pilot_access_status")
             in ("OPERATIONALLY_READY_INACTIVE", "PRODUCTION_READY_INACTIVE")),
        str((agg or {}).get("pilot_access")),
    )
    check(
        "invite_inactive",
        "enrollment_false",
        isinstance(agg, dict) and ((agg.get("pilot_access") or {}).get("enrollment_enabled") is False),
    )
    check(
        "invite_inactive",
        "invite_send_false",
        isinstance(agg, dict) and ((agg.get("pilot_access") or {}).get("invite_send_enabled") is False),
    )
    check(
        "invite_inactive",
        "real_invites_0",
        isinstance(agg, dict) and ((agg.get("pilot_access") or {}).get("real_invites_sent") == 0),
    )
    check(
        "ia_home",
        "seven_primary",
        isinstance(agg, dict) and len(((agg.get("ia") or {}).get("primary") or [])) == 7,
    )
    check(
        "ia_home",
        "no_jargon_primary",
        isinstance(agg, dict) and ((agg.get("ia") or {}).get("jargon_in_primary") is False),
    )
    check(
        "first_value",
        "contract_id",
        isinstance(agg, dict) and ((agg.get("first_value") or {}).get("id") == "pilot_first_value_v1"),
    )
    check(
        "first_value",
        "not_sign_in_alone",
        isinstance(agg, dict)
        and "sign_in_alone" in (((agg.get("first_value") or {}).get("not_sufficient") or [])),
    )

    st, daily = _req("GET", DAILY_OS, token=token)
    check("first_value", "daily_os_200", st == 200, str(st))
    check(
        "first_value",
        "daily_os_canonical",
        ((agg or {}).get("routes") or {}).get("daily_os_api") == DAILY_OS
        if isinstance(agg, dict)
        else False,
    )

    # Open useful surfaces (first value)
    for path, name in (
        ("/dashboard", "fe_home"),
        ("/dashboard/career", "fe_direction"),
        ("/dashboard/matches", "fe_opportunities"),
        ("/dashboard/portfolio", "fe_evidence"),
        ("/dashboard/approvals", "fe_decisions"),
        ("/dashboard/privacy-center", "fe_settings"),
        ("/onboarding", "fe_onboarding"),
    ):
        try:
            with urllib.request.urlopen(f"{FE}{path}", timeout=45, context=_CTX) as resp:
                check("ia_home", name, resp.status == 200, str(resp.status))
        except Exception as exc:
            check("ia_home", name, False, type(exc).__name__)

    st, tel = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "pilot_first_value_reached", "properties": {"surface": "e2e"}},
    )
    check("telemetry_privacy", "first_value_event", st == 200 and isinstance(tel, dict) and tel.get("ok") is True, str(st))
    check("telemetry_privacy", "kpi_excluded_flag", isinstance(tel, dict) and tel.get("kpi_excluded") is True)

    st, bad = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "secret_cv_dump", "properties": {"cv_text": "x"}},
    )
    check("telemetry_privacy", "reject_unknown", st == 400, str(st))

    st, home_ev = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "pilot_daily_os_opened", "properties": {"surface": "e2e"}},
    )
    check("telemetry_privacy", "daily_os_event", st == 200, str(st))

    check(
        "stance",
        "no_new_intel",
        isinstance(agg, dict) and ((agg.get("safety") or {}).get("new_intelligence_module") is False),
    )
    check(
        "stance",
        "phase3_not_started",
        isinstance(agg, dict) and ((agg.get("safety") or {}).get("phase_3_agent") == "NOT_STARTED"),
    )
    check(
        "stance",
        "no_app_submit",
        isinstance(agg, dict) and ((agg.get("safety") or {}).get("application_submission") is False),
    )
    check(
        "stance",
        "no_purchase",
        isinstance(agg, dict) and ((agg.get("safety") or {}).get("external_purchase_enrollment") is False),
    )

    st, unauth = _req("GET", "/api/v1/candidates/me/pilot-consolidation")
    check("deletion_security", "unauth_blocked", st in (401, 403), str(st))

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_expected_head",
        st == 200
        and isinstance(mig, dict)
        and mig.get("is_at_head") is True
        and str(mig.get("current_revision") or "") == "138_candidate_totp_mfa",
        str(mig)[:160] if isinstance(mig, dict) else str(st),
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
    failed = [(b, n, d) for b in buckets for n, ok, d in buckets[b] if not ok]
    for b, n, d in failed:
        print("FAILED", b, n, d)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
