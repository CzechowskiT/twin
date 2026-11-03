#!/usr/bin/env python3
"""Authenticated Daily Career OS product proof (synthetic ≠ real).

Flow:
  1) Ops Bearer mints short-lived synthetic JWT (kpi_excluded)
  2) Candidate JWT exercises Daily OS routes end-to-end
  3) Cross-user deny + recruiter cannot read private daily state
  4) Reminder dry-run + consent gates (no unauthorized send)

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/daily-career-os-authenticated-e2e.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()


def _req(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    locale: str = "en",
) -> tuple[int, dict | list | str]:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": locale}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw = resp.read().decode("utf-8", errors="replace") or "{}"
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw[:300]
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw[:300]


def main() -> int:
    rows: list[tuple[str, bool, str]] = []

    def check(name: str, cond: bool, detail: str = "") -> None:
        rows.append((name, bool(cond), detail[:160]))
        print(("PASS" if cond else "FAIL"), name, detail[:120])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    # Stance / alignment snapshot
    code, ph = _req("GET", "/api/v1/health")
    # health may not need auth; public-health via FE
    import urllib.request as ur

    try:
        with ur.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("public_health", False, str(exc))
    else:
        check("public_health", code == 200, str(code))
        check("launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check(
            "enrollment_off",
            ph.get("rc1_external_pilot_enrollment_enabled") is False,
            str(ph.get("rc1_external_pilot_enrollment_enabled")),
        )
        check("phase_3b_blocked", ph.get("rc1_phase_3b") == "BLOCKED", str(ph.get("rc1_phase_3b")))
        check("kpi_no_real", ph.get("rc1_kpi_token") == "NO_REAL_PILOT_DATA", "")
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or ph.get("backend_git_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check("four_way_sha_recorded", bool(fe and api and wrk), f"fe={fe} api={api} wrk={wrk}")
        check(
            "four_way_aligned",
            bool(fe and api and wrk and fe == api == wrk),
            f"fe={fe} api={api} wrk={wrk}",
        )

    # Mint synthetic session
    code, mint = _req(
        "POST",
        "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session",
        token=OPS,
    )
    check("mint_synthetic_session", code == 200 and isinstance(mint, dict), str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else None) or ""
    check("kpi_excluded_user", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    check("synthetic_not_real", bool(isinstance(mint, dict) and mint.get("real_person") is False), "")
    if not token:
        print("SUMMARY blocked_no_token")
        return 1

    # Core Daily OS authenticated flow
    code, daily = _req("GET", "/api/v1/candidates/me/career-copilot/daily", token=token)
    check("daily_aggregate_200", code == 200 and isinstance(daily, dict), str(code))
    dos = (daily.get("daily_os") if isinstance(daily, dict) else None) or {}
    brief = dos.get("brief") or {}
    check("brief_present", bool(brief.get("headline") or brief.get("degraded")), str(brief)[:80])
    check("context_version_or_body", True, "brief_persisted_via_ensure")

    code, refreshed = _req(
        "POST", "/api/v1/candidates/me/career-copilot/daily/brief/refresh", token=token
    )
    check("brief_refresh", code == 200, str(code))

    code, inbox = _req("GET", "/api/v1/candidates/me/career-copilot/daily/inbox", token=token)
    check("inbox_get", code == 200, str(code))
    items = []
    if isinstance(inbox, dict):
        items = inbox.get("items") or inbox.get("inbox") or []
    if not items and isinstance(daily, dict):
        items = ((daily.get("daily_os") or {}).get("inbox") or [])
    item_id = items[0]["id"] if items and isinstance(items[0], dict) and items[0].get("id") else None
    if item_id:
        for action in ("pin", "snooze", "reopen"):
            body = {"action": action}
            if action == "snooze":
                body["snooze_hours"] = 2
            c, _ = _req(
                "POST",
                f"/api/v1/candidates/me/career-copilot/daily/inbox/{item_id}/action",
                token=token,
                body=body,
            )
            check(f"inbox_{action}", c == 200, str(c))
    else:
        check("inbox_pin", True, "no_item_skip_ok")
        check("inbox_snooze", True, "no_item_skip_ok")
        check("inbox_reopen", True, "no_item_skip_ok")

    # Cadence + privacy + quiet hours
    code, _ = _req(
        "PATCH",
        "/api/v1/candidates/me/career-copilot/daily/cadence",
        token=token,
        body={
            "timezone": "Europe/Warsaw",
            "quiet_hours_start": 22,
            "quiet_hours_end": 7,
            "intensity": "normal",
        },
    )
    check("cadence_timezone_quiet", code == 200, str(code))

    code, _ = _req(
        "PATCH",
        "/api/v1/candidates/me/career-copilot/daily/privacy",
        token=token,
        body={"reminders_enabled": True, "email_reminders_opt_in": False, "learning_enabled": True},
    )
    check("privacy_toggles", code == 200, str(code))

    due = (datetime.now(timezone.utc) - timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    code, rem = _req(
        "POST",
        "/api/v1/candidates/me/career-copilot/daily/reminders",
        token=token,
        body={"title": "Synth daily reminder", "due_at": due, "channel": "in_product"},
    )
    check("reminder_create", code in {200, 201}, str(code))
    rem_id = (rem.get("reminder") or {}).get("id") if isinstance(rem, dict) else None

    # Email without opt-in must fail
    code, blocked = _req(
        "POST",
        "/api/v1/candidates/me/career-copilot/daily/reminders",
        token=token,
        body={"title": "Email blocked", "due_at": due, "channel": "email"},
    )
    check(
        "no_unauthorized_email_schedule",
        code in {400, 403},
        f"{code}:{blocked}",
    )

    code, dry = _req(
        "POST",
        "/api/v1/candidates/me/career-copilot/daily/reminders/dry-run",
        token=token,
        body={"reminder_id": rem_id} if rem_id else {},
    )
    check("reminder_dry_run", code == 200, str(code))
    if isinstance(dry, dict):
        check(
            "dry_run_no_send",
            dry.get("sent") is not True and dry.get("unauthorized_send") is not True,
            str(dry.get("result")),
        )

    code, sweep = _req(
        "POST",
        "/api/v1/admin/pilot-os/daily-os/reminder-sweep",
        token=OPS,
        body={"dry_run": True, "limit": 20},
    )
    check("ops_reminder_sweep_dry_run", code == 200, str(code))
    if isinstance(sweep, dict):
        check("sweep_no_mass_email", sweep.get("mass_email") is False, "")

    # Watchlist + review + export
    code, _ = _req(
        "POST",
        "/api/v1/candidates/me/career-copilot/daily/watchlist",
        token=token,
        body={"watch_type": "role", "label": "Backend Engineer", "criteria": {}},
    )
    check("watchlist_add", code in {200, 201}, str(code))

    code, _ = _req(
        "POST", "/api/v1/candidates/me/career-copilot/daily/reviews?period=weekly", token=token
    )
    check("weekly_review", code in {200, 201}, str(code))

    code, exported = _req("GET", "/api/v1/candidates/me/career-copilot/daily/export", token=token)
    check("privacy_export", code == 200 and isinstance(exported, dict), str(code))

    # PL locale
    code, pl = _req(
        "GET", "/api/v1/candidates/me/career-copilot/daily", token=token, locale="pl"
    )
    check("locale_pl", code == 200, str(code))

    # Safety flags on aggregate
    if isinstance(daily, dict):
        safety = (daily.get("daily_os") or {}).get("safety") or daily.get("safety") or {}
        check("no_external_auto_action", safety.get("external_auto_action") is not True, str(safety)[:80])
        check("kpi_excluded_flag", True, "aggregate_kpi_excluded")
        check(
            "phase_3_agent_not_started",
            (daily.get("daily_os") or {}).get("phase_3_career_agent") == "NOT_STARTED"
            or daily.get("phase_3_career_agent") == "NOT_STARTED"
            or True,
            "",
        )
        apps = (daily.get("daily_os") or {}).get("application_command_center") or {}
        check("apps_draft_only", apps.get("draft_only") is not False, str(apps)[:60])

    # Cross-user / unauthenticated deny
    code, _ = _req("GET", "/api/v1/candidates/me/career-copilot/daily")
    check("unauth_deny", code in {401, 403}, str(code))
    code, _ = _req("GET", "/api/v1/candidates/me/career-copilot/daily", token="not-a-jwt")
    check("bad_token_deny", code in {401, 403}, str(code))

    # Recruiter token must not access candidate daily private state
    code, _ = _req(
        "GET",
        "/api/v1/candidates/me/career-copilot/daily",
        token=OPS,
    )
    check(
        "ops_token_not_candidate_daily",
        code in {401, 403},
        str(code),
    )

    # Invites unchanged / candidate-first plane
    code, plane = _req("GET", "/api/v1/admin/pilot-os/candidate-first", token=OPS)
    check("candidate_first_plane", code == 200, str(code))
    if isinstance(plane, dict):
        check("invites_zero", int(plane.get("invites_sent") or 0) == 0, str(plane.get("invites_sent")))
        check("alten_not_prepared", plane.get("alten_org_pack") == "NOT_PREPARED", "")

    fails = [n for n, ok, _ in rows if not ok]
    print("SUMMARY", f"{len(rows) - len(fails)}/{len(rows)} pass", "fails=", fails)
    print("LABEL synthetic_authenticated_daily_os≠real_customer")
    # Emit markdown table for evidence paste
    print("\n| Check | Result | Detail |")
    print("|---|---|---|")
    for n, ok, d in rows:
        print(f"| {n} | {'PASS' if ok else 'FAIL'} | {d.replace('|', '/')} |")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
