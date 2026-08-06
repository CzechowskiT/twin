#!/usr/bin/env python3
"""Epic 2.11 synthetic E2E matrices A–F — never activates pilot or sends invites."""

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
        "A_stance": [],
        "B_guided_fv": [],
        "C_isolated_demo": [],
        "D_discoverability": [],
        "E_empty_privacy": [],
        "F_telemetry": [],
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
        check("A_stance", "public_health", False, str(exc))
    else:
        check("A_stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", "")
        check(
            "A_stance",
            "enrollment_off",
            ph.get("rc1_external_pilot_enrollment_enabled") is False,
            "",
        )
        check("A_stance", "invite_send_off", ph.get("rc1_invite_send_enabled") is False, "")
        check("A_stance", "real_invites_zero", ph.get("rc1_real_invites_sent") == 0, str(ph.get("rc1_real_invites_sent")))
        check(
            "A_stance",
            "access_ready_inactive",
            ph.get("rc1_pilot_access_status")
            in ("OPERATIONALLY_READY_INACTIVE", "PRODUCTION_READY_INACTIVE"),
            str(ph.get("rc1_pilot_access_status")),
        )
        check("A_stance", "phase_3b", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check("A_stance", "ms_write_off", ph.get("microsoft_calendar_write_enabled") is False, "")
        check(
            "A_stance",
            "eff_caps_zero",
            ph.get("rc1_effective_cohort_cap") in (0, None)
            and ph.get("rc1_effective_canary_cap") in (0, None),
            "",
        )

    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("A_stance", "mint_synth", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("A_stance", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        return 2

    # B guided first value
    st, cat = _req("GET", "/api/v1/candidates/me/guided-first-value/catalog", token=token)
    check("B_guided_fv", "catalog", st == 200, str(st))
    if isinstance(cat, dict):
        check("B_guided_fv", "entries_3", len(cat.get("entries") or []) == 3, "")
        check("B_guided_fv", "fv_contract_v1", cat.get("first_value_contract") == "pilot_first_value_v1", "")
    st, status = _req("GET", "/api/v1/candidates/me/guided-first-value", token=token)
    check("B_guided_fv", "status", st == 200, str(st))
    st, entry = _req(
        "POST",
        "/api/v1/candidates/me/guided-first-value/entry",
        token=token,
        body={"choice": "START_WITH_MY_DATA"},
    )
    check("B_guided_fv", "entry_my_data", st == 200 and isinstance(entry, dict) and entry.get("ok"), str(st))
    st, path = _req(
        "POST",
        "/api/v1/candidates/me/guided-first-value/starter-path",
        token=token,
        body={"path": "direction"},
    )
    check("B_guided_fv", "starter_direction", st == 200 and path.get("ok"), str(st))
    st, paused = _req("POST", "/api/v1/candidates/me/guided-first-value/pause", token=token)
    check("B_guided_fv", "pause", st == 200 and paused.get("state") == "PAUSED", str(paused.get("state") if isinstance(paused, dict) else ""))
    st, resumed = _req("POST", "/api/v1/candidates/me/guided-first-value/resume", token=token)
    check("B_guided_fv", "resume", st == 200 and resumed.get("state") == "IN_PROGRESS", "")

    # C isolated demo
    st, dem = _req("POST", "/api/v1/candidates/me/isolated-demo/start", token=token)
    check("C_isolated_demo", "start", st == 200 and dem.get("mode") == "DEMO", str(st))
    check("C_isolated_demo", "kpi_excluded", bool(dem.get("kpi_excluded")), "")
    check("C_isolated_demo", "writes_0", dem.get("canonical_writes") == 0, str(dem.get("canonical_writes")))
    check("C_isolated_demo", "no_promote", dem.get("promote_to_real") is False, "")
    st, seen = _req("POST", "/api/v1/candidates/me/guided-first-value/demo-first-value-seen", token=token)
    check(
        "C_isolated_demo",
        "demo_seen_not_real",
        st == 200 and seen.get("demo_first_value_seen") is True and seen.get("real_first_value_reached") is False,
        "",
    )
    st, cont = _req("GET", "/api/v1/candidates/me/isolated-demo/contamination", token=token)
    check("C_isolated_demo", "contamination_pass", st == 200 and cont.get("passed") is True, "")
    check("C_isolated_demo", "kpi_contam_0", cont.get("kpi_contamination") == 0, "")
    st, exited = _req("POST", "/api/v1/candidates/me/isolated-demo/exit", token=token)
    check("C_isolated_demo", "exit_clean", st == 200 and exited.get("demo_mode") is False, "")

    # D discoverability
    st, disc = _req("GET", "/api/v1/candidates/me/capability-discoverability", token=token)
    check("D_discoverability", "endpoint", st == 200, str(st))
    if isinstance(disc, dict):
        d = disc.get("discoverability") or {}
        e = disc.get("empty_states") or {}
        p = disc.get("public_preview") or {}
        check("D_discoverability", "primary_7", d.get("primary_count") == 7, str(d.get("primary_count")))
        check("D_discoverability", "no_8th", d.get("eighth_nav_item") is False, "")
        check("D_discoverability", "no_silent_scores", d.get("silent_personalization_scores") is False, "")
        check("D_discoverability", "tour_7", len((d.get("tour") or {}).get("steps") or []) == 7, "")
        check("D_discoverability", "tour_ne_fv", (d.get("tour") or {}).get("equals_first_value") is False, "")
        check(
            "D_discoverability",
            "preview_ready_inactive",
            p.get("status") == "READY_INACTIVE" and p.get("enabled_in_production") is False,
            "",
        )
        check(
            "D_discoverability",
            "empty_complete",
            e.get("complete_count") == e.get("expected_count") and e.get("complete_count", 0) >= 7,
            "",
        )
        check("D_discoverability", "loading_ne_empty", e.get("loading_equals_empty") is False, "")

    # E privacy / help recovery surface
    st, help_ = _req("GET", "/api/v1/candidates/me/pilot-operations/help", token=token)
    check("E_empty_privacy", "help_available", st == 200, str(st))
    st, ops = _req("GET", "/api/v1/candidates/me/pilot-operations", token=token)
    check("E_empty_privacy", "ops_aggregate", st == 200, str(st))
    if isinstance(ops, dict):
        contracts = ops.get("metric_contracts") or []
        ids = {c.get("id") for c in contracts if isinstance(c, dict)}
        check("E_empty_privacy", "contract_starter", "starter_path" in ids or "first_value" in ids, str(sorted(ids)[:8]))

    # F telemetry allowlist / reject
    st, ok_ev = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "product_tour_started", "properties": {"kpi_excluded": True}},
    )
    check("F_telemetry", "tour_event_ok", st == 200, str(st))
    st, bad = _req(
        "POST",
        "/api/v1/candidates/me/pilot-consolidation/telemetry",
        token=token,
        body={"event_name": "not_a_real_event_xyz", "properties": {"email": "x@y.z"}},
    )
    check("F_telemetry", "unknown_rejected", st in (400, 422) or (isinstance(bad, dict) and bad.get("ok") is False), str(st))

    # Final stance re-check — no real invites
    st, consol = _req("GET", "/api/v1/candidates/me/pilot-consolidation", token=token)
    check("A_stance", "consol_ok", st == 200, str(st))
    if isinstance(consol, dict):
        snap = consol.get("pilot_access") or consol
        check("A_stance", "invite_send_still_off", snap.get("invite_send_enabled") is False, "")
        check("A_stance", "real_invites_still_0", snap.get("real_invites_sent", 0) == 0, "")

    total = fails = 0
    for name, rows in buckets.items():
        ok = sum(1 for _, c, _ in rows if c)
        n = len(rows)
        total += n
        fails += n - ok
        print(f"BUCKET {name} {ok}/{n}")
    print(f"SUMMARY all={total - fails}/{total}")
    if fails:
        print("VERDICT_HINT=EPIC_211_PARTIAL")
        return 1
    print("VERDICT_HINT=EPIC_211_PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
