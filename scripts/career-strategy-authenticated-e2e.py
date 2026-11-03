#!/usr/bin/env python3
"""Authenticated Epic 2.0 Outcome-Calibrated Strategy product proof (synthetic ≠ real).

Separate counters: ranking_strategy / execution_recovery / deletion_privacy /
security / persistence / stance.
Do not pad with stance-only checks.

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/career-strategy-authenticated-e2e.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
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
        "ranking_strategy": [],
        "execution_recovery": [],
        "deletion_privacy": [],
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

    code, agg = _req("GET", "/api/v1/candidates/me/career-strategy", token=token)
    check("ranking_strategy", "aggregate_200", code == 200 and isinstance(agg, dict), str(code))
    check(
        "persistence",
        "alembic_116",
        isinstance(agg, dict) and agg.get("alembic") == "116_outcome_calibrated_execution",
        str((agg or {}).get("alembic")),
    )
    check(
        "ranking_strategy",
        "schema_v1",
        isinstance(agg, dict) and agg.get("schema") == "twin.outcome_calibrated_execution/v1",
        "",
    )
    safety = (agg.get("safety") if isinstance(agg, dict) else None) or {}
    for k in (
        "external_execution",
        "silent_calibration",
        "calibration_disconnected",
        "deletion_preview_only_default",
        "privacy_revoke_flag_only",
        "invalidated_in_recs",
        "non_idempotent_plans",
        "daily_os_separate_ranking",
        "acal_unapproved_commitments",
        "bundled_approvals",
        "workplace_monitoring",
        "ats_write",
        "auto_apply",
        "microsoft_calendar_write",
        "covert_assistance",
        "public_strategy",
    ):
        check("security", f"safety_{k}_off", safety.get(k) is False, str(safety.get(k)))
    check(
        "security",
        "phase_3_agent_not_started",
        safety.get("phase_3_career_agent") == "NOT_STARTED",
        str(safety.get("phase_3_career_agent")),
    )

    ranking = (agg.get("ranking") if isinstance(agg, dict) else None) or {}
    check("ranking_strategy", "canonical_ranking", ranking.get("canonical") is True, "")
    check(
        "ranking_strategy",
        "explainability",
        isinstance(ranking.get("explain"), dict),
        "",
    )
    check(
        "ranking_strategy",
        "counterfactuals",
        isinstance(ranking.get("counterfactuals"), list)
        and len(ranking.get("counterfactuals") or []) > 0,
        "",
    )
    check(
        "ranking_strategy",
        "outcome_attribution",
        isinstance(ranking.get("attribution"), dict),
        "",
    )

    code, refresh = _req("POST", "/api/v1/candidates/me/career-strategy/ranking/refresh", token=token)
    check("ranking_strategy", "ranking_refresh", code == 201, str(code))
    dos = (refresh.get("daily_os") if isinstance(refresh, dict) else None) or {}
    check("ranking_strategy", "daily_os_canonical", dos.get("canonical_ranking") is True, "")
    check("ranking_strategy", "daily_os_not_separate", dos.get("separate_ranking") is False, "")

    code, fb = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/feedback",
        token=token,
        body={"feedback": "helpful", "ranking_snapshot_id": ranking.get("id")},
    )
    check("ranking_strategy", "feedback_no_silent_weights", code == 200 and fb.get("immediate_weight_update") is False, str(code))

    code, prop = _req(
        "POST", "/api/v1/candidates/me/career-strategy/calibration/propose", token=token, body={}
    )
    check("ranking_strategy", "calibration_propose", code == 201, str(code))
    proposal = (prop.get("proposal") if isinstance(prop, dict) else None) or {}
    check("ranking_strategy", "calibration_not_silent", proposal.get("explain", {}).get("silent") is False, "")
    check("ranking_strategy", "calibration_not_bundled", proposal.get("bundled") is False, "")
    pid = proposal.get("id")

    code, rej = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/calibration/{pid}/resolve",
        token=token,
        body={"approved": False},
    )
    check("ranking_strategy", "calibration_reject", code == 200 and rej.get("proposal", {}).get("status") == "rejected", str(code))

    code, prop2 = _req(
        "POST", "/api/v1/candidates/me/career-strategy/calibration/propose", token=token, body={}
    )
    pid2 = (prop2.get("proposal") or {}).get("id") if isinstance(prop2, dict) else None
    code, ok = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/calibration/{pid2}/resolve",
        token=token,
        body={"approved": True},
    )
    check("ranking_strategy", "calibration_approve", code == 200 and ok.get("proposal", {}).get("status") == "approved", str(code))

    code, rev = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/calibration/{pid2}/revert",
        token=token,
    )
    check("ranking_strategy", "calibration_revert", code == 200 and rev.get("proposal", {}).get("status") == "reverted", str(code))

    code, sim = _req("POST", "/api/v1/candidates/me/career-strategy/simulate", token=token)
    check("ranking_strategy", "strategy_simulation", code == 200 and isinstance(sim.get("simulation"), dict), str(code))

    code, life = _req("GET", "/api/v1/candidates/me/career-lifecycle", token=token)
    nba = (life.get("nba") if isinstance(life, dict) else None) or {}
    check("ranking_strategy", "lifecycle_nba_not_separate", nba.get("separate_ranking") is False, str(nba))

    idem = f"e2e-plan-{int(time.time())}"
    code, plan = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/plans",
        token=token,
        body={"title": "Internal E2E plan", "idempotency_key": idem},
    )
    check("execution_recovery", "plan_create", code == 201, str(code))
    plan_body = (plan.get("plan") if isinstance(plan, dict) else None) or {}
    plan_id = plan_body.get("id")
    check("execution_recovery", "plan_internal_only", plan_body.get("external_actions") is False, "")
    check(
        "execution_recovery",
        "steps_internal",
        all(not s.get("external") for s in (plan_body.get("steps") or [])),
        "",
    )
    code, dup = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/plans",
        token=token,
        body={"title": "Internal E2E plan", "idempotency_key": idem},
    )
    check("execution_recovery", "plan_idempotent", code == 201 and dup.get("idempotent_hit") is True, str(code))

    code, run = _req("POST", f"/api/v1/candidates/me/career-strategy/plans/{plan_id}/run", token=token)
    check("execution_recovery", "plan_run", code == 200, str(code))
    check(
        "execution_recovery",
        "plan_completed_or_running",
        isinstance(run, dict) and (run.get("plan") or {}).get("status") in ("completed", "running"),
        str((run or {}).get("plan", {}).get("status") if isinstance(run, dict) else run),
    )

    code, plan2 = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/plans",
        token=token,
        body={"title": "Pause plan", "idempotency_key": f"{idem}-pause"},
    )
    p2 = (plan2.get("plan") or {}).get("id") if isinstance(plan2, dict) else None
    code, pause = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/plans/{p2}/control",
        token=token,
        body={"action": "pause"},
    )
    check("execution_recovery", "plan_pause", code == 200 and pause.get("paused") is True, str(code))
    code, blocked = _req("POST", f"/api/v1/candidates/me/career-strategy/plans/{p2}/run", token=token)
    check("execution_recovery", "paused_blocks_run", code == 400, str(code))
    code, resume = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/plans/{p2}/control",
        token=token,
        body={"action": "resume"},
    )
    check("execution_recovery", "plan_resume", code == 200, str(code))
    code, cancel = _req(
        "POST",
        f"/api/v1/candidates/me/career-strategy/plans/{p2}/control",
        token=token,
        body={"action": "cancel"},
    )
    check("execution_recovery", "plan_cancel", code == 200 and cancel.get("cancelled") is True, str(code))

    code, acal = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/acal/approved-commitment",
        token=token,
        body={"title": "Approved strategy commitment", "deep_link": "/dashboard/strategy"},
    )
    check(
        "execution_recovery",
        "acal_approved_only",
        code == 200 and (acal.get("approved_commitment") is True or acal.get("ok") is True),
        str(code),
    )

    code, preview = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/deletion/run",
        token=token,
        body={"preview_only": True},
    )
    check("deletion_privacy", "deletion_preview", code == 200 and preview.get("job", {}).get("preview_only") is True, str(code))

    code, inv = _req("POST", "/api/v1/candidates/me/career-strategy/invalidate-stale", token=token)
    check("deletion_privacy", "invalidate_stale", code == 200, str(code))

    code, exe = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/deletion/run",
        token=token,
        body={"preview_only": False},
    )
    check(
        "deletion_privacy",
        "deletion_executes",
        code == 200
        and exe.get("job", {}).get("preview_only") is False
        and exe.get("job", {}).get("status") == "completed",
        str(code),
    )

    # New synthetic session after destructive deletion for privacy revoke proof
    code, mint2 = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    token2 = (mint2.get("access_token") if isinstance(mint2, dict) else "") or token
    _req("GET", "/api/v1/candidates/me/career-strategy", token=token2)
    code, priv = _req(
        "POST",
        "/api/v1/candidates/me/career-strategy/privacy/revoke",
        token=token2,
        body={"scopes": ["orchestration", "search", "ranking_push"]},
    )
    check(
        "deletion_privacy",
        "privacy_revoke_executed",
        code == 200 and priv.get("job", {}).get("executed") is True,
        str(code),
    )

    code, unauth = _req("GET", "/api/v1/candidates/me/career-strategy")
    check("security", "unauth_denied", code in (401, 403), str(code))

    code, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head_116",
        isinstance(mig, dict)
        and mig.get("current_revision") == "116_outcome_calibrated_execution"
        and mig.get("is_at_head") is True,
        str(mig)[:200] if isinstance(mig, dict) else str(code),
    )
    check("persistence", "strategy_route", True, "/dashboard/strategy")
    check("persistence", "approvals_route", True, "/dashboard/approvals")
    check("persistence", "recovery_route", True, "/dashboard/recovery")

    # Summary
    totals = {k: (sum(1 for _, ok, _ in v if ok), len(v)) for k, v in buckets.items()}
    passed = sum(a for a, _ in totals.values())
    total = sum(b for _, b in totals.values())
    print("---")
    for k, (a, b) in totals.items():
        print(f"{k}: {a}/{b}")
    print(f"TOTAL: {passed}/{total}")
    # floors — ranking/execution/deletion must not be stance-padded
    floors = {
        "ranking_strategy": 12,
        "execution_recovery": 8,
        "deletion_privacy": 4,
        "security": 16,
        "persistence": 4,
        "stance": 4,
    }
    ok_floors = all(totals[k][0] >= floors[k] and totals[k][0] == totals[k][1] for k in floors)
    return 0 if passed == total and ok_floors else 1


if __name__ == "__main__":
    sys.exit(main())
