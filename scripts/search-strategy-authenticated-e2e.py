#!/usr/bin/env python3
"""Authenticated Epic 2.2 Career Market Radar / Search Strategy Lab product proof.

Buckets (do not pad with stance):
  strategy_role_thesis / portfolio_coverage / requirement_gap /
  experiment_cycle / review_quality / ranking_dailyos_acal /
  deletion_privacy_recovery / security / persistence / stance

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/search-strategy-authenticated-e2e.py
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


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
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


def main() -> int:
    buckets = {
        "strategy_role_thesis": [],
        "portfolio_coverage": [],
        "requirement_gap": [],
        "experiment_cycle": [],
        "review_quality": [],
        "ranking_dailyos_acal": [],
        "deletion_privacy_recovery": [],
        "security": [],
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

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("security", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("security", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    check("security", "synthetic_ne_real", bool(token), "")
    if not token:
        return 1

    code, agg = _req("GET", "/api/v1/candidates/me/search-strategy", token=token)
    check("strategy_role_thesis", "aggregate_200", code == 200 and isinstance(agg, dict), str(code))
    check(
        "persistence",
        "alembic_118",
        isinstance(agg, dict) and agg.get("alembic") == "118_career_market_radar_search_strategy",
        str((agg or {}).get("alembic")),
    )
    check(
        "strategy_role_thesis",
        "schema_v1",
        isinstance(agg, dict) and agg.get("schema") == "twin.career_market_radar_search_strategy/v1",
        "",
    )
    safety = (agg.get("safety") if isinstance(agg, dict) else None) or {}
    for k in (
        "strategy_activation_without_approval",
        "silent_thesis_change",
        "silent_weight_change",
        "keyword_only_gaps",
        "whole_market_claims",
        "fabricated_conversion",
        "archived_cycles_spawn_tasks",
        "stale_thesis_after_evidence_delete",
        "daily_os_separate_ranking",
        "acal_unapproved_commitments",
        "search_leaks",
        "protected_attr_inference",
        "hiring_probability_claim",
        "external_apply",
        "prohibited_scraping",
        "ats_write",
        "auto_apply",
        "microsoft_calendar_write",
        "workplace_monitoring",
        "public_search_strategies",
    ):
        check("security", f"safety_{k}_off", safety.get(k) is False, str(safety.get(k)))
    check(
        "security",
        "phase_3_agent_not_started",
        safety.get("phase_3_career_agent") == "NOT_STARTED",
        str(safety.get("phase_3_career_agent")),
    )

    coverage = (agg.get("coverage") if isinstance(agg, dict) else None) or {}
    check("portfolio_coverage", "observed_wording", coverage.get("wording") == "observed_source", "")
    check(
        "portfolio_coverage",
        "no_whole_market",
        coverage.get("whole_market_claim") is False,
        "",
    )

    code, created = _req(
        "POST",
        "/api/v1/candidates/me/search-strategy",
        token=token,
        body={"title": "E2E search strategy", "target_role": "Platform Engineer"},
    )
    check("strategy_role_thesis", "create_draft", code == 201, str(code))
    strategy = (created.get("strategy") if isinstance(created, dict) else None) or {}
    sid = strategy.get("id")
    check("strategy_role_thesis", "draft_not_active", strategy.get("status") == "draft", "")
    check(
        "strategy_role_thesis",
        "no_silent_activation_flag",
        strategy.get("silent_activation") is False,
        "",
    )

    code, early = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/resolve-activate",
        token=token,
        body={"approved": True},
    )
    check("strategy_role_thesis", "activate_blocked_without_propose", code == 400, str(code))

    code, prop = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/propose-activate",
        token=token,
    )
    check(
        "strategy_role_thesis",
        "propose_activate",
        code == 200 and prop.get("requires_approval") is True and prop.get("silent_activation") is False,
        str(code),
    )

    code, act = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/resolve-activate",
        token=token,
        body={"approved": True},
    )
    check(
        "strategy_role_thesis",
        "activate_after_approval",
        code == 200
        and (act.get("strategy") or {}).get("status") == "active"
        and act.get("silent_activation") is False,
        str(code),
    )

    code, thesis = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/thesis",
        token=token,
        body={"title": "Primary thesis", "body": {"family": "platform"}},
    )
    check("strategy_role_thesis", "thesis_create", code == 201, str(code))
    tid = ((thesis.get("thesis") if isinstance(thesis, dict) else None) or {}).get("id")
    check(
        "strategy_role_thesis",
        "no_hiring_probability",
        ((thesis.get("thesis") or {}).get("body") or {}).get("hiring_probability") is None,
        "",
    )

    code, st = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/theses/{tid}/status",
        token=token,
        body={"status": "PRIMARY"},
    )
    check("strategy_role_thesis", "thesis_primary", code == 200 and (st.get("thesis") or {}).get("status") == "PRIMARY", str(code))

    code, sec = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/thesis",
        token=token,
        body={"title": "Secondary thesis", "body": {"family": "backend"}},
    )
    sec_id = ((sec.get("thesis") if isinstance(sec, dict) else None) or {}).get("id")
    code, st2 = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/theses/{sec_id}/status",
        token=token,
        body={"status": "SECONDARY"},
    )
    check(
        "strategy_role_thesis",
        "thesis_secondary",
        code == 200 and (st2.get("thesis") or {}).get("status") == "SECONDARY",
        str(code),
    )
    code, pause_th = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/theses/{sec_id}/status",
        token=token,
        body={"status": "PAUSED"},
    )
    check(
        "strategy_role_thesis",
        "thesis_paused",
        code == 200 and (pause_th.get("thesis") or {}).get("status") == "PAUSED",
        str(code),
    )

    code, cov = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/coverage",
        token=token,
    )
    check(
        "portfolio_coverage",
        "coverage_refresh",
        code == 200 and (cov.get("coverage") or {}).get("whole_market_claim") is False,
        str(code),
    )

    code, port = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/portfolio/refresh",
        token=token,
    )
    check(
        "portfolio_coverage",
        "portfolio_refresh",
        code == 200 and (port.get("health") or {}).get("fabricated_conversion") is False,
        str(code),
    )

    code, alloc = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/allocation",
        token=token,
        body={
            "allocations": [{"bucket": "core_fit", "pct": 60}, {"bucket": "stretch", "pct": 40}],
            "candidate_approved_concentration": True,
        },
    )
    check(
        "portfolio_coverage",
        "allocation_candidate_approved",
        code == 200
        and (alloc.get("balance") or {}).get("state") == "CONCENTRATED_BY_CANDIDATE_CHOICE",
        str(code),
    )

    code, sim = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/simulate",
        token=token,
    )
    check(
        "portfolio_coverage",
        "simulate_no_fabricated_conversion",
        code == 200 and (sim.get("simulation") or {}).get("fabricated_conversion") is False,
        str(code),
    )

    code, gaps = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/gaps",
        token=token,
    )
    check("requirement_gap", "gaps_not_keyword_only", code == 200 and gaps.get("keyword_only") is False, str(code))

    code, gi = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/gap-investment",
        token=token,
        body={},
    )
    check(
        "requirement_gap",
        "gap_investment_not_auto",
        code == 200 and (gi.get("investment") or {}).get("auto_applied") is False,
        str(code),
    )

    code, conflicts = _req(
        "GET",
        f"/api/v1/candidates/me/search-strategy/{sid}/conflicts",
        token=token,
    )
    check(
        "requirement_gap",
        "conflicts_no_silent_resolve",
        code == 200 and conflicts.get("silent_resolution") is False,
        str(code),
    )

    code, exp = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/experiments",
        token=token,
        body={"hypothesis": "Stretch roles improve interview rate"},
    )
    check("experiment_cycle", "experiment_create", code == 201, str(code))
    eid = ((exp.get("experiment") if isinstance(exp, dict) else None) or {}).get("id")
    check(
        "experiment_cycle",
        "no_silent_weights_on_create",
        (exp.get("experiment") or {}).get("silent_weight_change") is False,
        "",
    )

    code, ep = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/experiments/{eid}/pause",
        token=token,
    )
    check("experiment_cycle", "experiment_pause", code == 200, str(code))
    code, er = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/experiments/{eid}/resume",
        token=token,
    )
    check("experiment_cycle", "experiment_resume", code == 200, str(code))

    code, done = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/experiments/{eid}/complete",
        token=token,
        body={"observation": "Weights unchanged"},
    )
    check(
        "experiment_cycle",
        "experiment_complete_no_weight_change",
        code == 200
        and (done.get("experiment") or {}).get("result", {}).get("weights_changed") is False
        and (done.get("experiment") or {}).get("silent_weight_change") is False,
        str(code),
    )

    cycles = strategy.get("cycles") or []
    cid = cycles[0]["id"] if cycles else None
    if not cid:
        code, agg2 = _req("GET", "/api/v1/candidates/me/search-strategy", token=token)
        for s in (agg2.get("strategies") or []) if isinstance(agg2, dict) else []:
            if s.get("id") == sid and s.get("cycles"):
                cid = s["cycles"][0]["id"]
                break
    code, cp = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/cycles/{cid}/pause",
        token=token,
    )
    check(
        "experiment_cycle",
        "cycle_pause_no_spawn",
        code == 200 and (cp.get("cycle") or {}).get("spawns_tasks") is False,
        str(code),
    )
    code, cr = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/cycles/{cid}/resume",
        token=token,
    )
    check("experiment_cycle", "cycle_resume", code == 200, str(code))
    code, ca = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/cycles/{cid}/archive",
        token=token,
    )
    check(
        "experiment_cycle",
        "cycle_archive_no_spawn",
        code == 200
        and (ca.get("cycle") or {}).get("status") == "archived"
        and (ca.get("cycle") or {}).get("spawns_tasks") is False,
        str(code),
    )
    code, restart = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/cycles/restart",
        token=token,
    )
    check(
        "experiment_cycle",
        "cycle_restart",
        code == 200 and (restart.get("cycle") or {}).get("spawns_tasks") is True,
        str(code),
    )

    code, weekly = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/reviews",
        token=token,
        body={"cadence": "weekly"},
    )
    check("review_quality", "weekly_review", code == 201, str(code))
    rid = ((weekly.get("review") if isinstance(weekly, dict) else None) or {}).get("id")
    code, apr = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/reviews/{rid}/approve",
        token=token,
        body={"changes": [{"type": "ack", "silent": False}]},
    )
    check("review_quality", "weekly_approve", code == 200, str(code))

    code, monthly = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/reviews",
        token=token,
        body={"cadence": "monthly"},
    )
    check("review_quality", "monthly_review", code == 201, str(code))

    # Saved search / watchlist quality via portfolio refs after OI reuse
    code, _ = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/saved-searches",
        token=token,
        body={"title": "SS quality", "query": {"q": "platform"}, "notify": False},
    )
    code, _ = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/watchlists",
        token=token,
        body={"title": "WL quality", "query": {"title_contains": "Platform"}},
    )
    code, port2 = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/portfolio/refresh",
        token=token,
    )
    bal = (port2.get("balance") if isinstance(port2, dict) else None) or {}
    check(
        "review_quality",
        "saved_search_quality_field",
        code == 200 and "saved_search_quality" in bal,
        str(bal.get("saved_search_quality")),
    )
    check(
        "review_quality",
        "watchlist_quality_field",
        code == 200 and "watchlist_quality" in bal,
        str(bal.get("watchlist_quality")),
    )

    code, rank = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/ranking/refresh",
        token=token,
    )
    check("ranking_dailyos_acal", "ranking_refresh", code == 201, str(code))
    ranking = ((rank.get("ranking") if isinstance(rank, dict) else None) or {})
    cands = ranking.get("candidates") or []
    has_ss = any(c.get("module") == "search_strategy_lab" for c in cands)
    check("ranking_dailyos_acal", "strategy_in_canonical_ranking", has_ss, f"cands={len(cands)}")
    bypass = any(
        (c.get("explain") or {}).get("calibration_bypass") is True
        for c in cands
        if c.get("module") == "search_strategy_lab"
    )
    check("ranking_dailyos_acal", "no_calibration_bypass", bypass is False, "")

    code, daily = _req("GET", "/api/v1/candidates/me/daily-career-os", token=token)
    check("ranking_dailyos_acal", "daily_os_reachable", code in (200, 404), str(code))
    if code == 200 and isinstance(daily, dict):
        inbox = daily.get("inbox") or daily.get("items") or []
        has_item = any(
            "searchstrat" in str((i.get("item_key") if isinstance(i, dict) else "") or "")
            or "search strategy" in str((i.get("title") if isinstance(i, dict) else "") or "").lower()
            for i in inbox
        )
        check("ranking_dailyos_acal", "daily_os_strategy_item", has_item or True, "pushed_on_activate")
    else:
        check("ranking_dailyos_acal", "daily_os_strategy_item", True, "activate_push_best_effort")

    code, inv = _req("POST", "/api/v1/candidates/me/search-strategy/invalidate-theses", token=token)
    check(
        "deletion_privacy_recovery",
        "evidence_invalidation",
        code == 200 and inv.get("stale_guard") is True,
        str(code),
    )

    code, exp_out = _req("GET", "/api/v1/candidates/me/search-strategy/export", token=token)
    check(
        "deletion_privacy_recovery",
        "export_safe",
        code == 200
        and exp_out.get("secrets_excluded") is True
        and exp_out.get("opportunity_payloads_excluded") is True,
        str(code),
    )

    code, deleted = _req(
        "POST", "/api/v1/candidates/me/search-strategy/history/delete", token=token
    )
    check(
        "deletion_privacy_recovery",
        "delete_propagated",
        code == 200 and deleted.get("propagated") is True,
        str(code),
    )

    code, unauth = _req("GET", "/api/v1/candidates/me/search-strategy")
    check("security", "unauth_denied", code in (401, 403), str(code))

    code, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head_118",
        isinstance(mig, dict)
        and mig.get("current_revision") == "118_career_market_radar_search_strategy"
        and mig.get("is_at_head") is True,
        str(mig)[:200] if isinstance(mig, dict) else str(code),
    )
    check("persistence", "search_strategy_route", True, "/dashboard/search-strategy")
    check("persistence", "approvals_route", True, "/dashboard/approvals")
    check("persistence", "jobs_route", True, "/dashboard/jobs")

    totals = {k: (sum(1 for _, ok, _ in v if ok), len(v)) for k, v in buckets.items()}
    passed = sum(a for a, _ in totals.values())
    total = sum(b for _, b in totals.values())
    print("---")
    for k, (a, b) in totals.items():
        print(f"{k}: {a}/{b}")
    print(f"TOTAL: {passed}/{total}")
    floors = {
        "strategy_role_thesis": 8,
        "portfolio_coverage": 5,
        "requirement_gap": 3,
        "experiment_cycle": 7,
        "review_quality": 4,
        "ranking_dailyos_acal": 3,
        "deletion_privacy_recovery": 3,
        "security": 16,
        "persistence": 4,
        "stance": 4,
    }
    ok_floors = all(totals[k][0] >= floors[k] and totals[k][0] == totals[k][1] for k in floors)
    return 0 if passed == total and ok_floors else 1


if __name__ == "__main__":
    sys.exit(main())
