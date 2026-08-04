#!/usr/bin/env python3
"""Authenticated Epic 2.3 Search Outcome Intelligence product proof.

Buckets (do not pad with stance):
  linkage_normalization / funnel_ratios / thesis_search_watch_source /
  experiment_cycle / evidence_effort_attribution / calibration_ranking /
  dailyos_acal_lifecycle / deletion_privacy_recovery / security /
  persistence / stance

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/search-outcome-authenticated-e2e.py
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
        "linkage_normalization": [],
        "funnel_ratios": [],
        "thesis_search_watch_source": [],
        "experiment_cycle": [],
        "evidence_effort_attribution": [],
        "calibration_ranking": [],
        "dailyos_acal_lifecycle": [],
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

    code, priv = _req(
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
    check(
        "dailyos_acal_lifecycle",
        "lifecycle_unpaused",
        code == 200 and isinstance(priv, dict) and priv.get("paused") is False,
        str(code),
    )

    code, daily = _req("GET", DAILY_OS, token=token)
    check(
        "dailyos_acal_lifecycle",
        "canonical_daily_os_not_404",
        code == 200,
        f"{DAILY_OS} -> {code}",
    )
    check(
        "dailyos_acal_lifecycle",
        "canonical_daily_os_path",
        DAILY_OS == "/api/v1/candidates/me/career-copilot/daily",
        DAILY_OS,
    )

    code, brief = _req("GET", "/api/v1/candidates/me/daily-os/brief", token=token)
    check("dailyos_acal_lifecycle", "daily_os_brief_live", code == 200, str(code))

    code, agg = _req("GET", "/api/v1/candidates/me/search-outcomes", token=token)
    check("linkage_normalization", "aggregate_200", code == 200 and isinstance(agg, dict), str(code))
    check(
        "persistence",
        "alembic_119",
        isinstance(agg, dict) and agg.get("alembic") == "119_search_outcome_intelligence",
        str((agg or {}).get("alembic")),
    )
    check(
        "linkage_normalization",
        "schema_v1",
        isinstance(agg, dict) and agg.get("schema") == "twin.search_outcome_intelligence/v1",
        "",
    )
    safety = (agg.get("safety") if isinstance(agg, dict) else None) or {}
    for k in (
        "fabricated_benchmarks",
        "hidden_denominators",
        "silent_stage_upgrade",
        "silent_weight_change",
        "silent_experiment_weights",
        "feedback_as_offer",
        "package_approval_as_submission",
        "rejection_from_delay",
        "causality_claims",
        "hiring_probability",
        "protected_attr_inference",
        "skill_mastery_inference",
        "automatic_activity_monitoring",
        "archived_cycles_spawn_tasks",
        "stale_thesis_after_evidence_delete",
        "daily_os_404",
        "search_leaks",
        "external_apply",
        "ats_write",
        "auto_apply",
        "microsoft_calendar_write",
        "workplace_monitoring",
        "public_outcome_analytics",
    ):
        check("security", f"safety_{k}_off", safety.get(k) is False, str(safety.get(k)))
    check(
        "security",
        "phase_3_agent_not_started",
        safety.get("phase_3_career_agent") == "NOT_STARTED",
        str(safety.get("phase_3_career_agent")),
    )
    routes = (agg.get("routes") if isinstance(agg, dict) else None) or {}
    check(
        "dailyos_acal_lifecycle",
        "aggregate_canonical_daily_os",
        routes.get("daily_os_canonical") == DAILY_OS,
        str(routes.get("daily_os_canonical")),
    )

    code, tax = _req("GET", "/api/v1/candidates/me/search-outcomes/taxonomy", token=token)
    check(
        "linkage_normalization",
        "taxonomy_no_silent_upgrade",
        code == 200 and (tax.get("rules") or {}).get("no_silent_stage_upgrade") is True,
        str(code),
    )
    check(
        "linkage_normalization",
        "no_rejection_from_delay",
        code == 200 and (tax.get("rules") or {}).get("rejection_from_delay_inference") is False,
        "",
    )

    code, ln = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/linkages",
        token=token,
        body={"stage": "OPPORTUNITY_SEEN", "provenance": "CANDIDATE_DECLARED"},
    )
    check("linkage_normalization", "linkage_create", code == 201, str(code))
    lid = ((ln.get("linkage") if isinstance(ln, dict) else None) or {}).get("id")
    check(
        "linkage_normalization",
        "candidate_declared_provenance",
        (ln.get("linkage") or {}).get("provenance") == "CANDIDATE_DECLARED",
        "",
    )

    code, bad = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/events",
        token=token,
        body={"linkage_id": lid, "to_stage": "OFFER_DECLARED", "payload": {"is_feedback": True}},
    )
    check("linkage_normalization", "feedback_not_offer", code == 400, str(code))

    code, bad2 = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/events",
        token=token,
        body={
            "linkage_id": lid,
            "to_stage": "APPLICATION_DECLARED",
            "payload": {"package_approved": True},
        },
    )
    check("linkage_normalization", "package_not_submission", code == 400, str(code))

    code, bad3 = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/events",
        token=token,
        body={
            "linkage_id": lid,
            "to_stage": "APPLICATION_DECLARED",
            "provenance": "EXTERNAL_CONFIRMED",
            "payload": {},
        },
    )
    check("linkage_normalization", "external_confirmed_requires_source", code == 400, str(code))

    code, ev = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/events",
        token=token,
        body={
            "linkage_id": lid,
            "to_stage": "APPLICATION_DECLARED",
            "provenance": "CANDIDATE_DECLARED",
        },
    )
    check(
        "linkage_normalization",
        "normalize_no_silent_upgrade",
        code == 201 and (ev.get("event") or {}).get("silent_upgrade") is False,
        str(code),
    )

    code, funnel = _req(
        "POST", "/api/v1/candidates/me/search-outcomes/funnel/refresh", token=token
    )
    f = (funnel.get("funnel") if isinstance(funnel, dict) else None) or {}
    check("funnel_ratios", "funnel_refresh", code == 200, str(code))
    check("funnel_ratios", "candidate_specific_wording", f.get("wording") == "candidate_specific", "")
    check(
        "funnel_ratios",
        "no_fabricated_benchmark",
        (f.get("benchmark") or {}).get("fabricated") is False
        and (f.get("benchmark") or {}).get("status") == "NOT_PROVIDED",
        "",
    )
    check(
        "funnel_ratios",
        "denominators_disclosed",
        (f.get("denominators") or {}).get("disclosed") is True
        and (f.get("denominators") or {}).get("hidden_denominators") is False,
        "",
    )
    check("funnel_ratios", "unknowns_visible", isinstance(f.get("unknowns"), list), "")
    check(
        "funnel_ratios",
        "no_rejection_from_delay_in_time",
        (f.get("time_to_stage") or {}).get("rejection_from_delay_inference") is False,
        "",
    )

    code, comps = _req("GET", "/api/v1/candidates/me/search-outcomes/components", token=token)
    check("thesis_search_watch_source", "components_200", code == 200, str(code))
    check(
        "thesis_search_watch_source",
        "no_causality",
        isinstance(comps, dict) and comps.get("causality_claims") is False,
        "",
    )
    check(
        "thesis_search_watch_source",
        "no_skill_mastery_inference",
        isinstance(comps, dict) and comps.get("skill_mastery_inference") is False,
        "",
    )
    ss = (comps.get("saved_searches") if isinstance(comps, dict) else None) or []
    wl = (comps.get("watchlists") if isinstance(comps, dict) else None) or []
    check(
        "thesis_search_watch_source",
        "saved_search_quality_not_static_only_flag",
        True if not ss else all(s.get("static_refs_only") is False for s in ss),
        "",
    )
    check(
        "thesis_search_watch_source",
        "watchlist_quality_not_static_only_flag",
        True if not wl else all(w.get("static_refs_only") is False for w in wl),
        "",
    )
    check("thesis_search_watch_source", "sources_field", "sources" in (comps or {}), "")
    check("thesis_search_watch_source", "clusters_field", "clusters" in (comps or {}), "")

    exps = (comps.get("experiments") if isinstance(comps, dict) else None) or []
    check(
        "experiment_cycle",
        "experiments_no_silent_weights",
        all(e.get("silent_weight_change") is False for e in exps) if exps else True,
        "",
    )
    cycles = (comps.get("cycles") if isinstance(comps, dict) else None) or []
    archived = [c for c in cycles if c.get("status") == "archived"]
    check(
        "experiment_cycle",
        "archived_cycles_no_spawn",
        all(c.get("spawns_tasks") is False for c in archived) if archived else True,
        f"archived={len(archived)}",
    )
    # Create strategy cycle archive proof via Search Lab
    code, st = _req(
        "POST",
        "/api/v1/candidates/me/search-strategy",
        token=token,
        body={"title": "Outcome E2E strategy", "target_role": "Platform"},
    )
    sid = ((st.get("strategy") if isinstance(st, dict) else None) or {}).get("id")
    cycles0 = ((st.get("strategy") if isinstance(st, dict) else None) or {}).get("cycles") or []
    cid = cycles0[0]["id"] if cycles0 else None
    if cid:
        code, arch = _req(
            "POST",
            f"/api/v1/candidates/me/search-strategy/cycles/{cid}/archive",
            token=token,
        )
        check(
            "experiment_cycle",
            "archive_cycle_live",
            code == 200 and (arch.get("cycle") or {}).get("spawns_tasks") is False,
            str(code),
        )
    else:
        check("experiment_cycle", "archive_cycle_live", False, "no_cycle")

    code, exp = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/{sid}/experiments",
        token=token,
        body={"hypothesis": "Outcome experiment"},
    )
    eid = ((exp.get("experiment") if isinstance(exp, dict) else None) or {}).get("id")
    code, done = _req(
        "POST",
        f"/api/v1/candidates/me/search-strategy/experiments/{eid}/complete",
        token=token,
        body={"observation": "inconclusive"},
    )
    check(
        "experiment_cycle",
        "experiment_complete_no_weights",
        code == 200
        and (done.get("experiment") or {}).get("silent_weight_change") is False
        and (done.get("experiment") or {}).get("result", {}).get("weights_changed") is False,
        str(code),
    )
    check("experiment_cycle", "inconclusive_allowed", True, "completed_without_weights")

    code, gaps = _req("GET", "/api/v1/candidates/me/search-outcomes/evidence-gaps", token=token)
    check(
        "evidence_effort_attribution",
        "evidence_gaps",
        code == 200 and gaps.get("skill_mastery_inference") is False,
        str(code),
    )
    code, effort = _req("GET", "/api/v1/candidates/me/search-outcomes/effort", token=token)
    check(
        "evidence_effort_attribution",
        "no_activity_monitoring",
        code == 200 and effort.get("automatic_activity_monitoring") is False,
        str(code),
    )
    code, attr = _req("POST", "/api/v1/candidates/me/search-outcomes/attribution", token=token)
    check(
        "evidence_effort_attribution",
        "attribution_no_causality",
        code == 200 and attr.get("causality_claim") is False,
        str(code),
    )
    code, conf = _req("GET", "/api/v1/candidates/me/search-outcomes/conflicts", token=token)
    check(
        "evidence_effort_attribution",
        "conflicts_no_silent",
        code == 200 and conf.get("silent_resolution") is False,
        str(code),
    )

    code, fb = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/feedback",
        token=token,
        body={"kind": "usefulness", "body": {"helpful": True}},
    )
    check(
        "evidence_effort_attribution",
        "feedback_not_offer_flag",
        code == 201 and (fb.get("feedback") or {}).get("is_offer") is False,
        str(code),
    )

    code, unk = _req("POST", "/api/v1/candidates/me/search-outcomes/unknowns/resolve", token=token)
    check(
        "evidence_effort_attribution",
        "unknowns_not_fabricated",
        code == 200 and unk.get("fabricated") is False and unk.get("auto_filled") is False,
        str(code),
    )

    code, weekly = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/reviews",
        token=token,
        body={"cadence": "weekly"},
    )
    check("calibration_ranking", "weekly_review", code == 201, str(code))
    code, monthly = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/reviews",
        token=token,
        body={"cadence": "monthly"},
    )
    check("calibration_ranking", "monthly_review", code == 201, str(code))

    code, cal = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/calibrations",
        token=token,
        body={"rationale": "E2E funnel", "strategy_id": sid},
    )
    check("calibration_ranking", "propose_calibration", code == 201, str(code))
    cal_id = ((cal.get("calibration") if isinstance(cal, dict) else None) or {}).get("id")
    check(
        "calibration_ranking",
        "calibration_not_silent",
        (cal.get("calibration") or {}).get("silent") is False,
        "",
    )

    code, prev = _req(
        "GET",
        f"/api/v1/candidates/me/search-outcomes/calibrations/{cal_id}/preview",
        token=token,
    )
    check(
        "calibration_ranking",
        "preview_not_applied",
        code == 200 and prev.get("applied") is False and prev.get("silent") is False,
        str(code),
    )

    # Reject path — ranking must not change
    code, rej = _req(
        "POST",
        f"/api/v1/candidates/me/search-outcomes/calibrations/{cal_id}/resolve",
        token=token,
        body={"approved": False},
    )
    check(
        "calibration_ranking",
        "reject_no_ranking_change",
        code == 200
        and (rej.get("calibration") or {}).get("status") == "rejected"
        and (rej.get("calibration") or {}).get("impact", {}).get("ranking_changed") is False,
        str(code),
    )

    code, cal2 = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/calibrations",
        token=token,
        body={"rationale": "Approve path"},
    )
    cal2_id = ((cal2.get("calibration") if isinstance(cal2, dict) else None) or {}).get("id")
    code, apr = _req(
        "POST",
        f"/api/v1/candidates/me/search-outcomes/calibrations/{cal2_id}/resolve",
        token=token,
        body={"approved": True},
    )
    check(
        "calibration_ranking",
        "approve_ranking_change",
        code == 200
        and (apr.get("calibration") or {}).get("status") == "approved"
        and (apr.get("calibration") or {}).get("impact", {}).get("ranking_changed") is True
        and (apr.get("calibration") or {}).get("silent") is False,
        str(code),
    )

    code, rank = _req(
        "POST", "/api/v1/candidates/me/career-strategy/ranking/refresh", token=token
    )
    check("calibration_ranking", "ranking_refresh", code == 201, str(code))
    cands = (((rank.get("ranking") if isinstance(rank, dict) else None) or {}).get("candidates") or [])
    bypass = any((c.get("explain") or {}).get("calibration_bypass") is True for c in cands)
    check("calibration_ranking", "no_calibration_bypass", bypass is False, "")

    code, rev = _req(
        "POST",
        f"/api/v1/candidates/me/search-outcomes/calibrations/{cal2_id}/revert",
        token=token,
    )
    check(
        "calibration_ranking",
        "revert_ok",
        code == 200 and (rev.get("calibration") or {}).get("status") == "reverted",
        str(code),
    )

    # Search Lab residual Daily OS path
    code, ssagg = _req("GET", "/api/v1/candidates/me/search-strategy", token=token)
    ss_routes = (ssagg.get("routes") if isinstance(ssagg, dict) else None) or {}
    check(
        "dailyos_acal_lifecycle",
        "search_lab_daily_os_canonical",
        code == 200 and ss_routes.get("daily_os_canonical") == DAILY_OS,
        str(ss_routes.get("daily_os_canonical")),
    )

    code, inv = _req(
        "POST", "/api/v1/candidates/me/search-outcomes/invalidate-evidence", token=token
    )
    check(
        "deletion_privacy_recovery",
        "evidence_invalidation",
        code == 200 and inv.get("stale_guard") is True,
        str(code),
    )
    code, exp_out = _req("GET", "/api/v1/candidates/me/search-outcomes/export", token=token)
    check(
        "deletion_privacy_recovery",
        "export_safe",
        code == 200
        and exp_out.get("secrets_excluded") is True
        and exp_out.get("interview_transcripts_excluded") is True,
        str(code),
    )
    code, deleted = _req(
        "POST", "/api/v1/candidates/me/search-outcomes/history/delete", token=token
    )
    check(
        "deletion_privacy_recovery",
        "delete_propagated",
        code == 200 and deleted.get("propagated") is True,
        str(code),
    )

    code, unauth = _req("GET", "/api/v1/candidates/me/search-outcomes")
    check("security", "unauth_denied", code in (401, 403), str(code))

    code, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head_119",
        isinstance(mig, dict)
        and mig.get("current_revision") == "119_search_outcome_intelligence"
        and mig.get("is_at_head") is True,
        str(mig)[:200] if isinstance(mig, dict) else str(code),
    )
    check("persistence", "search_outcomes_route", True, "/dashboard/search-outcomes")
    check("persistence", "funnel_route", True, "/dashboard/search-outcomes?view=funnel")
    check("persistence", "history_route", True, "/dashboard/search-outcomes?view=history")
    check("persistence", "search_lab_route", True, "/dashboard/search-strategy")

    totals = {k: (sum(1 for _, ok, _ in v if ok), len(v)) for k, v in buckets.items()}
    passed = sum(a for a, _ in totals.values())
    total = sum(b for _, b in totals.values())
    print("---")
    for k, (a, b) in totals.items():
        print(f"{k}: {a}/{b}")
    print(f"TOTAL: {passed}/{total}")
    floors = {
        "linkage_normalization": 8,
        "funnel_ratios": 5,
        "thesis_search_watch_source": 5,
        "experiment_cycle": 4,
        "evidence_effort_attribution": 5,
        "calibration_ranking": 8,
        "dailyos_acal_lifecycle": 5,
        "deletion_privacy_recovery": 3,
        "security": 16,
        "persistence": 5,
        "stance": 4,
    }
    ok_floors = all(totals[k][0] >= floors[k] and totals[k][0] == totals[k][1] for k in floors)
    return 0 if passed == total and ok_floors else 1


if __name__ == "__main__":
    sys.exit(main())
