#!/usr/bin/env python3
"""Authenticated Acceptance Calendar product proof (synthetic ≠ real).

Uses ops mint (kpi_excluded) then candidate JWT against Acceptance Calendar routes.
Verifies no Microsoft write, ICS safety, holds internal-only, isolation.

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/acceptance-calendar-authenticated-e2e.py
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


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw = resp.read().decode("utf-8", errors="replace") or "{}"
            if "text/calendar" in (resp.headers.get("Content-Type") or ""):
                return resp.status, raw
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw[:400]
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw[:400]


def main() -> int:
    rows: list[tuple[str, bool, str]] = []

    def check(name: str, cond: bool, detail: str = "") -> None:
        rows.append((name, bool(cond), detail[:160]))
        print(("PASS" if cond else "FAIL"), name, detail[:120])

    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    # Public health / stance / alignment
    try:
        with urllib.request.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("public_health", False, str(exc))
    else:
        check("public_health", code == 200, str(code))
        check("launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check("enrollment_off", ph.get("rc1_external_pilot_enrollment_enabled") is False, "")
        check("phase_3b_blocked", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check("ms_write_off_ph", ph.get("microsoft_calendar_write_enabled") is False, "")
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check("four_way_recorded", bool(fe and api and wrk), f"fe={fe} api={api} wrk={wrk}")
        check("four_way_aligned", fe == api == wrk and bool(fe), f"fe={fe} api={api} wrk={wrk}")

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        print("SUMMARY blocked")
        return 1

    code, cal = _req("GET", "/api/v1/candidates/me/acceptance-calendar", token=token)
    check("aggregate_200", code == 200 and isinstance(cal, dict), str(code))
    if isinstance(cal, dict):
        safety = cal.get("safety") or {}
        check("no_ms_write", safety.get("microsoft_write") is False, str(safety))
        check("no_autonomous", safety.get("autonomous_scheduling") is False, "")
        check("phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED", "")
        check("alembic_110", cal.get("alembic") == "110_acceptance_calendar", str(cal.get("alembic")))
        ms = cal.get("microsoft") or {}
        check("ms_write_flag_false", ms.get("write_enabled") is False, "")
        check("scopes_no_write_claim", ms.get("write_scopes_blocked") is True, "")
        check("feasibility_present", bool((cal.get("feasibility") or {}).get("status")), "")
        check("budget_explicit", (cal.get("budget") or {}).get("inferred_private_obligations") is False, "")
        check("consent_unbundled", (cal.get("consent") or {}).get("bundled_opt_in") is False, "")

    code, _ = _req(
        "PATCH",
        "/api/v1/candidates/me/acceptance-calendar/budget",
        token=token,
        body={"hours_per_week": 8, "timezone": "Europe/Warsaw"},
    )
    check("budget_update", code == 200, str(code))

    code, out = _req(
        "POST",
        "/api/v1/candidates/me/acceptance-calendar/outcomes",
        token=token,
        body={"title": "Accept a role I would show up for", "description": "Synthetic outcome"},
    )
    check("outcome_create", code in {200, 201}, str(code))
    if isinstance(out, dict):
        check("no_hiring_certainty", (out.get("outcome") or {}).get("hiring_certainty") == "UNKNOWN", "")

    code, _ = _req("POST", "/api/v1/candidates/me/acceptance-calendar/refresh", token=token)
    check("refresh", code == 200, str(code))

    for view in (
        "today",
        "agenda",
        "week",
        "unscheduled",
        "interviews",
        "applications",
        "learning",
        "at_risk",
    ):
        c, _ = _req("GET", f"/api/v1/candidates/me/acceptance-calendar/views/{view}", token=token)
        check(f"view_{view}", c == 200, str(c))

    code, holds = _req("POST", "/api/v1/candidates/me/acceptance-calendar/holds/propose", token=token)
    check("propose_holds", code == 200, str(code))
    if isinstance(holds, dict):
        check("holds_not_external", holds.get("externally_booked") is False and holds.get("microsoft_write") is False, "")
        lst = holds.get("holds") or []
        if lst:
            hid = lst[0]["id"]
            c, h = _req(
                "POST",
                f"/api/v1/candidates/me/acceptance-calendar/holds/{hid}/action",
                token=token,
                body={"action": "accept"},
            )
            check("hold_accept_internal", c == 200 and (h.get("external_created") is False if isinstance(h, dict) else False), str(c))

    code, plan = _req("POST", "/api/v1/candidates/me/acceptance-calendar/weekly-plan", token=token)
    check("weekly_plan", code in {200, 201}, str(code))
    if isinstance(plan, dict) and (plan.get("plan") or {}).get("id"):
        pid = plan["plan"]["id"]
        c, _ = _req(
            "POST",
            f"/api/v1/candidates/me/acceptance-calendar/weekly-plan/{pid}/approve",
            token=token,
            body={"approved": True},
        )
        check("weekly_approve", c == 200, str(c))

    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar/conflicts", token=token)
    check("conflicts", code == 200, str(code))
    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar/feasibility", token=token)
    check("feasibility", code == 200, str(code))
    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar/microsoft", token=token)
    check("microsoft_status", code == 200, str(code))
    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar/monthly", token=token)
    check("monthly", code == 200, str(code))

    code, _ = _req(
        "PATCH",
        "/api/v1/candidates/me/acceptance-calendar/consent",
        token=token,
        body={"ics_export_opt_in": True, "ms_busy_read_opt_in": False},
    )
    check("consent_patch", code == 200, str(code))

    code, ics = _req("GET", "/api/v1/candidates/me/acceptance-calendar/ics", token=token)
    check("ics_export", code == 200 and isinstance(ics, str) and "BEGIN:VCALENDAR" in ics, str(code))
    if isinstance(ics, str):
        check("ics_no_attendee", "ATTENDEE" not in ics, "")
        check("ics_no_organizer", "ORGANIZER" not in ics, "")

    code, _ = _req(
        "POST",
        "/api/v1/candidates/me/acceptance-calendar/preferences",
        token=token,
        body={"prefs": {"prefer_mornings": True, "guilt_nudge": True}},
    )
    check("prefs_feedback", code == 200, str(code))

    code, exp = _req("GET", "/api/v1/candidates/me/acceptance-calendar/export", token=token)
    check("privacy_export", code == 200, str(code))

    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar")
    check("unauth_deny", code in {401, 403}, str(code))
    code, _ = _req("GET", "/api/v1/candidates/me/acceptance-calendar", token=OPS)
    check("ops_not_candidate_cal", code in {401, 403}, str(code))

    code, plane = _req("GET", "/api/v1/admin/pilot-os/candidate-first", token=OPS)
    check("candidate_first", code == 200, str(code))
    if isinstance(plane, dict):
        check("invites_zero", int(plane.get("invites_sent") or 0) == 0, "")

    # FE route exists
    try:
        with urllib.request.urlopen(f"{FE}/dashboard/acceptance", timeout=30, context=_CTX) as resp:
            check("fe_acceptance_route", resp.status in {200, 307, 308}, str(resp.status))
    except urllib.error.HTTPError as exc:
        check("fe_acceptance_route", exc.code in {200, 307, 308, 401}, str(exc.code))
    except Exception as exc:
        check("fe_acceptance_route", False, str(exc))

    fails = [n for n, ok, _ in rows if not ok]
    print("SUMMARY", f"{len(rows) - len(fails)}/{len(rows)} pass", "fails=", fails)
    print("LABEL synthetic_authenticated_acceptance_calendar≠real_customer")
    print("\n| Check | Result | Detail |")
    print("|---|---|---|")
    for n, ok, d in rows:
        print(f"| {n} | {'PASS' if ok else 'FAIL'} | {d.replace('|', '/')} |")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
