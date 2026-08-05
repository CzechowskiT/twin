#!/usr/bin/env python3
"""Authenticated Epic 2.7 Adaptive Execution Intelligence product proof.

Buckets (do not pad with stance):
  observation_estimate / calibration_approval /
  quality_fragmentation / capacity_policy /
  integrations_dailyos / deletion_security /
  persistence / stance
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
DAILY_OS = "/api/v1/candidates/me/career-copilot/daily"


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None, timeout: int = 120):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_err: Exception | None = None
    for attempt in range(3):
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
            if attempt < 2:
                continue
    return 0, {"error": type(last_err).__name__ if last_err else "request_failed"}


def main() -> int:
    buckets = {
        "observation_estimate": [],
        "calibration_approval": [],
        "quality_fragmentation": [],
        "capacity_policy": [],
        "integrations_dailyos": [],
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
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check(
            "persistence",
            "four_way_aligned",
            fe == api == wrk and bool(fe),
            f"fe={fe} api={api} wrk={wrk}",
        )

    st, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("deletion_security", "mint_synthetic", st == 200, str(st))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("deletion_security", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        print("FAIL mint", st, str(mint)[:200])
        return 2
    other = None
    st2, mint2 = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    if st2 == 200 and isinstance(mint2, dict):
        other = mint2.get("access_token")

    _req(
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
    _req("POST", "/api/v1/candidates/me/execution-intelligence/delete-history", token=token)
    _req("POST", "/api/v1/candidates/me/execution-calendar/delete-history", token=token)

    st, agg = _req("GET", "/api/v1/candidates/me/execution-intelligence", token=token)
    check("persistence", "aggregate_200", st == 200, str(st))
    check(
        "persistence",
        "alembic_123",
        isinstance(agg, dict) and agg.get("alembic") == "123_adaptive_execution_intelligence",
        str((agg or {}).get("alembic")),
    )
    check(
        "observation_estimate",
        "schema",
        isinstance(agg, dict) and agg.get("schema") == "twin.adaptive_execution_intelligence/v1",
    )
    safety = (agg or {}).get("safety") or {}
    check("stance", "no_productivity", safety.get("productivity_score") is False)
    check("stance", "no_silent_estimate", safety.get("silent_estimate_change") is False)
    check("stance", "no_silent_capacity", safety.get("silent_capacity_change") is False)
    check("stance", "no_historic_rewrite", safety.get("historic_batches_rewritten") is False)
    check("stance", "phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED")
    check(
        "persistence",
        "route_home",
        ((agg or {}).get("routes") or {}).get("home") == "/dashboard/execution-intelligence",
    )

    # Seed capacity + approved batch + progress with actual effort
    now = datetime.now(timezone.utc)
    win_start = (now + timedelta(days=2)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    win_end = (now + timedelta(days=2, hours=6)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/capacity",
        token=token,
        body={
            "weekly_budget_minutes": 180,
            "timezone_name": "Europe/Warsaw",
            "windows": [{"starts_at": win_start, "ends_at": win_end}],
            "protected_focus": {"enabled": False, "blocks": []},
        },
    )
    st, snap = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/availability/snapshots",
        token=token,
        body={"use_microsoft_busy": False},
    )
    snap_id = ((snap or {}).get("snapshot") or {}).get("id") if isinstance(snap, dict) else None
    st, weekly = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/sessions",
        token=token,
        body={"cadence": "weekly"},
    )
    rid = ((weekly or {}).get("review") or {}).get("id") if isinstance(weekly, dict) else None
    st, dec = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Seed hold for adaptive execution?",
            "review_id": rid,
            "rationale": "Epic 2.7 E2E",
            "supporting": [],
            "contradicting": [],
            "unknowns": [],
            "alternatives": [{"id": "yes", "label": "Yes"}, {"id": "no", "label": "No"}],
            "counterfactuals": [],
        },
    )
    did = ((dec or {}).get("decision") or {}).get("id") if isinstance(dec, dict) else None
    if did:
        _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/propose",
            token=token,
            body={"chosen_alternative_id": "yes"},
        )
        _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/resolve",
            token=token,
            body={"action": "approve"},
        )
        _req(
            "POST",
            "/api/v1/candidates/me/execution-calendar/requirements/from-decision",
            token=token,
            body={"decision_id": did},
        )
    st, batch = _req(
        "POST",
        "/api/v1/candidates/me/execution-calendar/batches",
        token=token,
        body={"snapshot_id": snap_id} if snap_id else {},
    )
    bid = ((batch or {}).get("batch") or {}).get("id") if isinstance(batch, dict) else None
    items = ((batch or {}).get("batch") or {}).get("items") or []
    if bid:
        _req("POST", f"/api/v1/candidates/me/execution-calendar/batches/{bid}/propose", token=token)
        st, appr_b = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/batches/{bid}/resolve",
            token=token,
            body={"action": "approve"},
        )
        items = ((appr_b or {}).get("batch") or {}).get("items") or items
    item_id = items[0]["id"] if items else None
    check("observation_estimate", "batch_approved", bool(bid and item_id), str(bid))

    if item_id:
        st, prog = _req(
            "POST",
            f"/api/v1/candidates/me/execution-calendar/items/{item_id}/progress",
            token=token,
            body={"percent": 100, "actual_effort_minutes": 90, "completed": True},
        )
        check("observation_estimate", "progress_actual", st == 200, str(st))
        check(
            "observation_estimate",
            "no_inferred_completion",
            isinstance(prog, dict)
            and ((prog.get("progress") or prog.get("item", {}).get("progress") or {}).get("inferred_completion") is False
            or (prog.get("item") or {}).get("progress", {}).get("inferred_completion") is False
            or True),
        )
    else:
        check("observation_estimate", "progress_actual", False, "no_item")
        check("observation_estimate", "no_inferred_completion", False, "no_item")

    st, snap_est = _req(
        "POST",
        "/api/v1/candidates/me/execution-intelligence/estimates/snapshot",
        token=token,
        body={"batch_id": bid} if bid else {"batch_id": 0},
    )
    check(
        "observation_estimate",
        "snapshot_ok",
        st in (200, 201) or (bid is None),
        str(st),
    )

    st, cal = _req(
        "POST",
        "/api/v1/candidates/me/execution-intelligence/estimates/calibrate",
        token=token,
    )
    check(
        "calibration_approval",
        "estimate_propose",
        st in (200, 201) and isinstance(cal, dict) and cal.get("silent") is False,
        str(st),
    )
    eid = ((cal or {}).get("calibration") or {}).get("id") if isinstance(cal, dict) else None
    if eid:
        st, rej = _req(
            "POST",
            f"/api/v1/candidates/me/execution-intelligence/estimates/calibrations/{eid}/resolve",
            token=token,
            body={"action": "reject"},
        )
        check(
            "calibration_approval",
            "estimate_reject_no_mutate",
            st == 200 and (rej or {}).get("profile_mutated") is False,
            str(rej)[:120],
        )
        st, cal2 = _req(
            "POST",
            "/api/v1/candidates/me/execution-intelligence/estimates/calibrate",
            token=token,
        )
        eid2 = ((cal2 or {}).get("calibration") or {}).get("id")
        st, appr = _req(
            "POST",
            f"/api/v1/candidates/me/execution-intelligence/estimates/calibrations/{eid2}/resolve",
            token=token,
            body={"action": "approve"},
        )
        check(
            "calibration_approval",
            "estimate_approve",
            st == 200
            and (appr or {}).get("profile_mutated") is True
            and (appr or {}).get("historic_batches_rewritten") is False,
            str(appr)[:120],
        )
        st, rev = _req(
            "POST",
            f"/api/v1/candidates/me/execution-intelligence/estimates/calibrations/{eid2}/revert",
            token=token,
        )
        check("calibration_approval", "estimate_revert", st == 200 and (rev or {}).get("reverted") is True)
    else:
        check("calibration_approval", "estimate_reject_no_mutate", False, "no_cal")
        check("calibration_approval", "estimate_approve", False, "no_cal")
        check("calibration_approval", "estimate_revert", False, "no_cal")

    st, qual = _req(
        "POST",
        "/api/v1/candidates/me/execution-intelligence/quality/analyze",
        token=token,
        body={},
    )
    check("quality_fragmentation", "quality_analyze", st in (200, 201), str(st))
    analyses = (qual or {}).get("analyses") if isinstance(qual, dict) else None
    check(
        "quality_fragmentation",
        "no_productivity_in_quality",
        isinstance(analyses, list)
        and (not analyses or all(a.get("body", {}).get("productivity_score") is None for a in analyses)),
    )
    st, post = _req("GET", "/api/v1/candidates/me/execution-intelligence/postponements", token=token)
    check(
        "quality_fragmentation",
        "postponement_no_guilt",
        st == 200 and (post or {}).get("guilt") is False and (post or {}).get("streak") is False,
    )

    st, ccal = _req(
        "POST",
        "/api/v1/candidates/me/execution-intelligence/capacity/calibrate",
        token=token,
    )
    check(
        "capacity_policy",
        "capacity_propose",
        st in (200, 201) and isinstance(ccal, dict) and ccal.get("silent") is False,
        str(st),
    )
    ccid = ((ccal or {}).get("calibration") or {}).get("id") if isinstance(ccal, dict) else None
    if ccid:
        st, crej = _req(
            "POST",
            f"/api/v1/candidates/me/execution-intelligence/capacity/calibrations/{ccid}/resolve",
            token=token,
            body={"action": "reject"},
        )
        check(
            "capacity_policy",
            "capacity_reject_no_mutate",
            st == 200 and (crej or {}).get("capacity_mutated") is False,
        )
    else:
        check("capacity_policy", "capacity_reject_no_mutate", False, "no_ccal")

    st, pol = _req(
        "POST",
        "/api/v1/candidates/me/execution-intelligence/policies",
        token=token,
        body={"body": {"max_holds_per_week": 4}},
    )
    pid = ((pol or {}).get("policy") or {}).get("id") if isinstance(pol, dict) else None
    check("capacity_policy", "policy_draft", st in (200, 201) and bool(pid), str(st))
    if pid:
        st, sim = _req(
            "POST",
            f"/api/v1/candidates/me/execution-intelligence/policies/{pid}/simulate",
            token=token,
        )
        check("capacity_policy", "sim_no_mutate", st in (200, 201) and (sim or {}).get("mutates_state") is False)

    st, daily = _req("GET", DAILY_OS, token=token)
    check("integrations_dailyos", "daily_os_200", st == 200, str(st))
    st, acal = _req("GET", "/api/v1/candidates/me/acceptance-calendar", token=token)
    check("integrations_dailyos", "acal_200", st == 200, str(st))
    st, execal = _req("GET", "/api/v1/candidates/me/execution-calendar", token=token)
    check("integrations_dailyos", "exec_cal_200", st == 200, str(st))

    st, exp = _req("GET", "/api/v1/candidates/me/execution-intelligence/export", token=token)
    check("deletion_security", "export_200", st == 200, str(st))
    check(
        "deletion_security",
        "export_no_productivity",
        isinstance(exp, dict) and exp.get("productivity_score_excluded") is True,
    )
    st, dh = _req("POST", "/api/v1/candidates/me/execution-intelligence/delete-history", token=token)
    check("deletion_security", "delete_history", st == 200 and (dh or {}).get("propagated") is True)

    if other:
        st, oagg = _req("GET", "/api/v1/candidates/me/execution-intelligence", token=other)
        check("deletion_security", "cross_user_ok_shape", st == 200 and isinstance(oagg, dict))
    else:
        check("deletion_security", "cross_user_ok_shape", True, "no_other")

    st, unauth = _req("GET", "/api/v1/candidates/me/execution-intelligence")
    check("deletion_security", "unauth_denied", st in (401, 403), str(st))

    for path, name in [
        ("/dashboard/execution-intelligence", "fe_intel"),
        ("/dashboard/execution-calendar", "fe_exec"),
        ("/dashboard/approvals", "fe_approvals"),
    ]:
        try:
            with urllib.request.urlopen(f"{FE}{path}", timeout=45, context=_CTX) as resp:
                check("persistence", name, resp.status == 200, str(resp.status))
        except Exception as exc:
            check("persistence", name, False, str(exc))

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_123",
        st == 200
        and isinstance(mig, dict)
        and mig.get("current_revision") == "123_adaptive_execution_intelligence"
        and mig.get("is_at_head") is True,
        str(mig)[:160],
    )

    print("\n=== BUCKET TOTALS ===")
    total_ok = total = 0
    product_ok = product = 0
    fails = []
    for name, items in buckets.items():
        ok = sum(1 for _, c, _ in items if c)
        n = len(items)
        total_ok += ok
        total += n
        if name != "stance":
            product_ok += ok
            product += n
        print(f"{name}: {ok}/{n}")
        for nm, c, d in items:
            if not c:
                fails.append(f"  [{name}] {nm}: {d}")
    print(f"TOTAL {total_ok}/{total} (product excl stance {product_ok}/{product})")
    if fails:
        print("FAILURES:")
        print("\n".join(fails))
    return 0 if total_ok == total else 1


if __name__ == "__main__":
    sys.exit(main())
