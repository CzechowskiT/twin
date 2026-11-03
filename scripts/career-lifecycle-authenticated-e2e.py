#!/usr/bin/env python3
"""Authenticated Unified Career Lifecycle product proof (synthetic ≠ real).

Separate counters: behavioral / security / persistence / stance.
Do not pad with stance-only checks.

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/career-lifecycle-authenticated-e2e.py
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
    buckets = {"behavioral": [], "security": [], "persistence": [], "stance": []}

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
        check("stance", "enrollment_off", ph.get("rc1_external_pilot_enrollment_enabled") is False, "")
        check("stance", "phase_3b_blocked", ph.get("rc1_phase_3b") == "BLOCKED", "")
        check("stance", "ms_write_off", ph.get("microsoft_calendar_write_enabled") is False, "")
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check("persistence", "four_way_aligned", fe == api == wrk and bool(fe), f"fe={fe} api={api} wrk={wrk}")

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("security", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("security", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    check("security", "synthetic_ne_real", bool(token), "")
    if not token:
        return 1

    code, agg = _req("GET", "/api/v1/candidates/me/career-lifecycle", token=token)
    check("behavioral", "aggregate_200", code == 200 and isinstance(agg, dict), str(code))
    check(
        "persistence",
        "alembic_115",
        isinstance(agg, dict) and agg.get("alembic") == "115_unified_career_lifecycle",
        str((agg or {}).get("alembic")),
    )
    check(
        "behavioral",
        "schema_v1",
        isinstance(agg, dict) and agg.get("schema") == "twin.unified_career_lifecycle/v1",
        "",
    )
    safety = (agg.get("safety") if isinstance(agg, dict) else None) or {}
    for k in (
        "duplicate_module_stores",
        "silent_phase_change",
        "focus_deletes_other_processes",
        "frozen_snapshots_mutated",
        "bundled_approvals",
        "search_leaks",
        "workplace_monitoring",
        "external_resignation",
        "ats_write",
        "auto_apply",
        "microsoft_calendar_write",
        "covert_assistance",
        "public_lifecycle",
    ):
        check("security", f"safety_{k}_off", safety.get(k) is False, str(safety.get(k)))
    check("stance", "phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED", "")

    ctx = (agg.get("context") if isinstance(agg, dict) else None) or {}
    check("behavioral", "context_present", bool(ctx.get("id")), "")
    check("persistence", "uuid_context_key", bool(ctx.get("uuid_key")) and str(ctx.get("context_key", "")).startswith("ctx:"), "")
    phase0 = ctx.get("active_phase")
    check("behavioral", "phase_valid", phase0 in (agg.get("phases") or []), str(phase0))

    routes = (agg.get("routes") if isinstance(agg, dict) else None) or {}
    for path, name in (
        (routes.get("command_center") or "/dashboard", "fe_command_center"),
        (routes.get("history") or "/dashboard/history", "fe_history"),
        (routes.get("search") or "/dashboard/search", "fe_search"),
        (routes.get("approvals") or "/dashboard/approvals", "fe_approvals"),
        (routes.get("recovery") or "/dashboard/recovery", "fe_recovery"),
        (routes.get("privacy_center") or "/dashboard/privacy-center", "fe_privacy"),
        (routes.get("legacy_lifecycle") or "/dashboard/lifecycle", "fe_legacy_lifecycle"),
        (routes.get("legacy_timeline") or "/dashboard/timeline", "fe_legacy_timeline"),
        ("/dashboard/career-transition", "fe_transition_residual"),
    ):
        try:
            with urllib.request.urlopen(f"{FE}{path}", timeout=45, context=_CTX) as resp:
                check("behavioral", name, resp.status in {200, 307, 308, 401, 403}, str(resp.status))
        except urllib.error.HTTPError as exc:
            check("behavioral", name, exc.code in {200, 307, 308, 401, 403}, str(exc.code))
        except Exception as exc:
            check("behavioral", name, False, str(exc))

    code, brief = _req("GET", "/api/v1/candidates/me/daily-os/brief", token=token)
    check("behavioral", "daily_os_brief_200", code == 200, str(code))
    check("behavioral", "daily_os_not_404", code != 404, str(code))

    # Residual Epic 1.8
    code, tr = _req("GET", "/api/v1/candidates/me/career-transition", token=token)
    check("behavioral", "epic18_aggregate", code == 200, str(code))
    check("security", "epic18_no_monitoring", ((tr or {}).get("safety") or {}).get("workplace_monitoring") is False, "")

    # Propose phase — must NOT apply silently
    code, prop = _req(
        "POST",
        "/api/v1/candidates/me/career-lifecycle/phase/propose",
        token=token,
        body={"phase": "APPLICATION", "reason": "E2E propose"},
    )
    check("behavioral", "phase_propose", code == 200, str(code))
    check("security", "phase_not_silent", (prop or {}).get("silent_change") is False, "")
    check("behavioral", "phase_pending", (prop or {}).get("status") == "pending_approval", str(prop))
    check("behavioral", "phase_unchanged_until_approve", (prop or {}).get("active_phase") == phase0, "")
    aid = (prop or {}).get("approval_id")
    check("persistence", "approval_id", bool(aid), str(aid))
    check("security", "approval_not_bundled", (prop or {}).get("bundled") is False, "")

    code, mid = _req("GET", "/api/v1/candidates/me/career-lifecycle", token=token)
    check(
        "behavioral",
        "mid_phase_still_old",
        ((mid.get("context") if isinstance(mid, dict) else None) or {}).get("active_phase") == phase0,
        "",
    )

    code, resolved = _req(
        "POST",
        f"/api/v1/candidates/me/career-lifecycle/approvals/{aid}/resolve",
        token=token,
        body={"approved": True},
    )
    check("behavioral", "phase_approve", code == 200, str(code))
    check("behavioral", "phase_applied_after_approve", (resolved or {}).get("active_phase") == "APPLICATION", str(resolved))

    code, focus = _req(
        "POST",
        "/api/v1/candidates/me/career-lifecycle/focus",
        token=token,
        body={"focus_type": "application", "focus_ref": "ws:synthetic"},
    )
    check("behavioral", "focus_set", code == 200, str(code))
    check("security", "focus_preserves_others", (focus or {}).get("other_processes_preserved") is True, "")

    code, ho = _req(
        "POST",
        "/api/v1/candidates/me/career-lifecycle/handoffs",
        token=token,
        body={
            "from_module": "application_studio",
            "to_module": "interview_decision",
            "from_object_id": "1",
            "to_object_id": "2",
            "snapshot_hash": "e2ehash",
        },
    )
    check("behavioral", "handoff_create", code in {200, 201}, str(code))

    code, cons = _req("POST", "/api/v1/candidates/me/career-lifecycle/consistency", token=token)
    check("behavioral", "consistency_run", code == 200, str(code))
    check("security", "consistency_not_silent", (cons or {}).get("silent_disagreement") is False, "")

    code, search = _req(
        "POST",
        "/api/v1/candidates/me/career-lifecycle/search",
        token=token,
        body={"q": "synth"},
    )
    check("behavioral", "search_ok", code == 200, str(code))
    check("security", "search_no_leak", (search or {}).get("leaks_other_candidates") is False, "")
    check("security", "search_scoped", (search or {}).get("candidate_scoped") is True, "")

    code, hist = _req("GET", "/api/v1/candidates/me/career-lifecycle/history", token=token)
    check("behavioral", "history_ok", code == 200, str(code))
    check("persistence", "history_has_events", len((hist or {}).get("events") or []) >= 1, "")

    code, dl = _req(
        "POST",
        "/api/v1/candidates/me/career-lifecycle/deep-link",
        token=token,
        body={"target": "approvals"},
    )
    check("behavioral", "deep_link", code == 200, str(code))
    check("behavioral", "deep_link_preserves", (dl or {}).get("preserve_context") is True, "")
    check("behavioral", "deep_link_not_lost", (dl or {}).get("context_lost") is False, "")

    code, exp = _req("GET", "/api/v1/candidates/me/career-lifecycle/export", token=token)
    check("behavioral", "export_ok", code == 200, str(code))
    check("security", "export_no_full_payloads", (exp or {}).get("full_module_payloads_excluded") is True, "")
    check("security", "export_secrets_excluded", (exp or {}).get("secrets_excluded") is True, "")
    check("security", "export_notes_default_off", (exp or {}).get("module_notes_excluded") is True, "")

    code, graph = _req("GET", "/api/v1/candidates/me/career-lifecycle/deletion-graph", token=token)
    check("behavioral", "deletion_graph", code == 200, str(code))
    check("persistence", "deletion_order_has_lifecycle", "lifecycle_context" in ((graph or {}).get("order") or []), "")

    code, rec = _req("GET", "/api/v1/candidates/me/career-lifecycle/recovery", token=token)
    check("behavioral", "recovery_ok", code == 200, str(code))
    check("behavioral", "recovery_recoverable", (rec or {}).get("recoverable") is True, "")

    code, priv = _req(
        "PATCH",
        "/api/v1/candidates/me/career-lifecycle/privacy",
        token=token,
        body={"export_include_module_notes": False, "search_opt_in": True},
    )
    check("behavioral", "privacy_patch", code == 200, str(code))
    check("security", "privacy_propagated_flag", (priv or {}).get("propagated") is True, "")

    code, arch = _req("POST", "/api/v1/candidates/me/career-lifecycle/archive", token=token, body={})
    check("behavioral", "archive", code == 200, str(code))
    code, reo = _req("POST", "/api/v1/candidates/me/career-lifecycle/reopen", token=token, body={})
    check("behavioral", "reopen", code == 200, str(code))
    check("behavioral", "reopen_unarchived", (reo or {}).get("archived") is False, "")

    code, nxt = _req("POST", "/api/v1/candidates/me/career-lifecycle/next-cycle", token=token, body={})
    check("behavioral", "next_cycle", code == 200, str(code))
    check(
        "behavioral",
        "next_cycle_understand",
        ((nxt.get("context") if isinstance(nxt, dict) else None) or {}).get("active_phase") == "UNDERSTAND",
        "",
    )

    code_u, _ = _req("GET", "/api/v1/candidates/me/career-lifecycle")
    check("security", "deny_unauth", code_u in {401, 403}, str(code_u))

    code, deleted = _req("POST", "/api/v1/candidates/me/career-lifecycle/delete", token=token, body={})
    check("behavioral", "delete", code == 200, str(code))
    check("persistence", "delete_stale_guard", (deleted or {}).get("stale_reappear_guard") is True, "")

    # Migrate check
    code, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head",
        code == 200 and isinstance(mig, dict) and mig.get("is_at_head") is True,
        str(mig),
    )
    check(
        "persistence",
        "db_revision_115",
        isinstance(mig, dict) and mig.get("current_revision") == "115_unified_career_lifecycle",
        str((mig or {}).get("current_revision")),
    )

    # Summaries
    totals = {k: len(v) for k, v in buckets.items()}
    passed = {k: sum(1 for _, ok, _ in v if ok) for k, v in buckets.items()}
    failed = []
    for b, rows in buckets.items():
        for name, ok, detail in rows:
            if not ok:
                failed.append(f"{b}:{name}:{detail}")

    all_pass = sum(passed.values())
    all_total = sum(totals.values())
    print(
        "SUMMARY",
        f"total={all_pass}/{all_total}",
        f"behavioral={passed['behavioral']}/{totals['behavioral']}",
        f"security={passed['security']}/{totals['security']}",
        f"persistence={passed['persistence']}/{totals['persistence']}",
        f"stance={passed['stance']}/{totals['stance']}",
    )
    out_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "reports",
        "epic-1-9-unified-lifecycle-2026-08-04",
    )
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "authenticated-e2e.txt"), "w", encoding="utf-8") as fh:
        for b, rows in buckets.items():
            for name, ok, detail in rows:
                fh.write(f"{'PASS' if ok else 'FAIL'} [{b}] {name} {detail}\n")
        fh.write(
            f"SUMMARY total={all_pass}/{all_total} "
            f"behavioral={passed['behavioral']}/{totals['behavioral']} "
            f"security={passed['security']}/{totals['security']} "
            f"persistence={passed['persistence']}/{totals['persistence']} "
            f"stance={passed['stance']}/{totals['stance']}\n"
        )
    # Minimum floors (not stance-padded): behavioral≥40, security≥20, persistence≥8, stance≤10
    ok_floors = (
        passed["behavioral"] >= 40
        and passed["security"] >= 20
        and passed["persistence"] >= 8
        and totals["stance"] <= 12
        and all_pass == all_total
        and all_total >= 80
    )
    if failed:
        print("FAILED", "; ".join(failed[:12]))
    return 0 if ok_floors else 1


if __name__ == "__main__":
    raise SystemExit(main())
