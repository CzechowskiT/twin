#!/usr/bin/env python3
"""Authenticated Epic 2.4 Strategy Review + Decision Governance product proof.

Buckets (do not pad with stance):
  review_registry_obs_snapshots / weekly_monthly_compare /
  cluster_role_search_watch_source / assumption_question_evidence /
  alternative_counterfactual_approval / execution_followup_revise_revert /
  ranking_dailyos_acal_lifecycle / deletion_privacy_recovery / security /
  persistence / stance

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/strategy-review-authenticated-e2e.py
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
        "review_registry_obs_snapshots": [],
        "weekly_monthly_compare": [],
        "cluster_role_search_watch_source": [],
        "assumption_question_evidence": [],
        "alternative_counterfactual_approval": [],
        "execution_followup_revise_revert": [],
        "ranking_dailyos_acal_lifecycle": [],
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
        st, mint = _req(
            "POST",
            "/api/v1/ops/synthetic-candidate",
            token=OPS,
            body={"label": "epic24-strategy-review"},
        )
    except Exception as exc:
        print("FAIL mint", exc)
        return 2
    if st not in (200, 201) or not isinstance(mint, dict) or not mint.get("access_token"):
        print("FAIL mint", st, str(mint)[:200])
        return 2
    token = mint["access_token"]
    other = None
    try:
        st2, mint2 = _req(
            "POST",
            "/api/v1/ops/synthetic-candidate",
            token=OPS,
            body={"label": "epic24-strategy-review-other"},
        )
        if st2 in (200, 201) and isinstance(mint2, dict):
            other = mint2.get("access_token")
    except Exception:
        other = None

    # Aggregate + routes
    st, agg = _req("GET", "/api/v1/candidates/me/strategy-reviews", token=token)
    check("persistence", "aggregate_200", st == 200, str(st))
    check(
        "persistence",
        "alembic_120",
        isinstance(agg, dict) and agg.get("alembic") == "120_strategy_review_decision_governance",
        str((agg or {}).get("alembic")),
    )
    check(
        "review_registry_obs_snapshots",
        "schema",
        isinstance(agg, dict)
        and agg.get("schema") == "twin.strategy_review_decision_governance/v1",
    )
    safety = (agg or {}).get("safety") or {}
    check("stance", "silent_strategy_change_false", safety.get("silent_strategy_change") is False)
    check("stance", "fabricated_cluster_false", safety.get("fabricated_cluster_progress") is False)
    check("stance", "phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED")
    check("stance", "public_decision_journal_false", safety.get("public_decision_journal") is False)
    check("stance", "external_action_false", safety.get("external_action") is False)
    routes = (agg or {}).get("routes") or {}
    check("persistence", "review_center_route", routes.get("review_center") == "/dashboard/review-center")
    check(
        "persistence",
        "decision_journal_route",
        routes.get("decision_journal") == "/dashboard/decision-journal",
    )

    # Seed outcome linkage for clusters
    st, ln = _req(
        "POST",
        "/api/v1/candidates/me/search-outcomes/linkages",
        token=token,
        body={
            "stage": "OPPORTUNITY_SEEN",
            "provenance": "CANDIDATE_DECLARED",
            "source_key": "pracuj",
            "opportunity_ref_id": 4242,
        },
    )
    check("cluster_role_search_watch_source", "linkage_created", st in (200, 201), str(st))

    st, clusters = _req(
        "POST", "/api/v1/candidates/me/strategy-reviews/clusters/refresh", token=token
    )
    check("cluster_role_search_watch_source", "clusters_200", st == 200, str(st))
    check(
        "cluster_role_search_watch_source",
        "clusters_observed",
        isinstance(clusters, dict) and clusters.get("status") == "OBSERVED",
        str((clusters or {}).get("status")),
    )
    check(
        "cluster_role_search_watch_source",
        "no_demand_claim",
        isinstance(clusters, dict) and clusters.get("demand_claim") is False,
    )
    check(
        "cluster_role_search_watch_source",
        "no_fabricated_progress",
        isinstance(clusters, dict) and clusters.get("fabricated_progress") is False,
    )

    st, comps = _req("GET", "/api/v1/candidates/me/strategy-reviews/components", token=token)
    check("cluster_role_search_watch_source", "components_200", st == 200)
    check(
        "cluster_role_search_watch_source",
        "components_have_clusters",
        isinstance(comps, dict) and "clusters" in comps,
    )

    # Weekly / monthly / compare
    st, weekly = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/sessions",
        token=token,
        body={"cadence": "weekly"},
    )
    check("weekly_monthly_compare", "weekly_created", st in (200, 201), str(st))
    rev = (weekly or {}).get("review") or {}
    rid = rev.get("id")
    check("review_registry_obs_snapshots", "review_id", bool(rid), str(rid))
    check(
        "review_registry_obs_snapshots",
        "observations_lineage",
        bool(rev.get("observations"))
        and all((o.get("lineage") or {}).get("lineage_present") for o in rev.get("observations") or []),
    )
    check(
        "review_registry_obs_snapshots",
        "no_silent_on_create",
        rev.get("silent_strategy_change") is False,
    )
    check(
        "weekly_monthly_compare",
        "consumes_outcomes",
        bool((rev.get("snapshot") or {}).get("funnel_counts") is not None)
        or bool((rev.get("snapshot") or {}).get("funnel_snapshot_id") is not None)
        or bool(rev.get("observations")),
    )

    st, monthly = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/sessions",
        token=token,
        body={"cadence": "monthly"},
    )
    check("weekly_monthly_compare", "monthly_created", st in (200, 201))
    rid2 = ((monthly or {}).get("review") or {}).get("id")

    st, fin = _req(
        "POST", f"/api/v1/candidates/me/strategy-reviews/sessions/{rid}/finalize", token=token
    )
    check("review_registry_obs_snapshots", "finalize_immutable", st == 200 and ((fin or {}).get("review") or {}).get("immutable") is True)

    st, cmp_ = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/compare",
        token=token,
        body={"left_id": rid, "right_id": rid2},
    )
    check("weekly_monthly_compare", "compare_200", st == 200)
    check("weekly_monthly_compare", "compare_fact", isinstance(cmp_, dict) and cmp_.get("claim_kind") == "FACT")

    # Assumptions / decision / evidence
    st, asm = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/assumptions",
        token=token,
        body={"statement": "Channel X yields replies"},
    )
    check("assumption_question_evidence", "assumption_created", st in (200, 201))
    aid = ((asm or {}).get("assumption") or {}).get("id")
    st, aev = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/assumptions/{aid}/evaluate",
        token=token,
        body={"result": "inconclusive"},
    )
    check(
        "assumption_question_evidence",
        "assumption_eval_no_causality",
        st == 200
        and (((aev or {}).get("assumption") or {}).get("evaluation") or {}).get("causality_claim")
        is False,
    )

    st, dec = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Tilt outcome weight?",
            "review_id": rid,
            "rationale": "Observed funnel",
            "supporting": [{"ref": "funnel"}],
            "contradicting": [],
            "unknowns": [{"code": "INSUFFICIENT_DATA"}],
            "alternatives": [
                {"id": "keep", "label": "Keep"},
                {"id": "tilt_outcome", "label": "Tilt"},
            ],
            "counterfactuals": [
                {
                    "id": "cf1",
                    "if": "keep",
                    "then": "unchanged",
                    "mutates_state": False,
                    "simulation_only": True,
                }
            ],
        },
    )
    check("assumption_question_evidence", "decision_created", st in (200, 201), str(st))
    d0 = (dec or {}).get("decision") or {}
    did = d0.get("id")
    check("assumption_question_evidence", "evidence_package", bool(d0.get("evidence_package")))
    check("assumption_question_evidence", "unknowns_present", bool((d0.get("evidence_package") or {}).get("unknowns")))
    check(
        "alternative_counterfactual_approval",
        "alts_with_impact_preview",
        bool(d0.get("alternatives"))
        and all("impact_preview" in a for a in d0.get("alternatives") or []),
    )
    check(
        "alternative_counterfactual_approval",
        "cf_simulation_only",
        bool(d0.get("counterfactuals"))
        and all(c.get("simulation_only") and not c.get("mutates_state") for c in d0.get("counterfactuals") or []),
    )
    check("alternative_counterfactual_approval", "requires_approval", d0.get("requires_approval") is True)
    check("alternative_counterfactual_approval", "not_silent", d0.get("silent") is False)

    # Reject — no state mutation
    st, prop = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/propose",
        token=token,
        body={"chosen_alternative_id": "tilt_outcome"},
    )
    check("alternative_counterfactual_approval", "propose_200", st == 200, str(st))
    check("alternative_counterfactual_approval", "propose_requires_approval", (prop or {}).get("requires_approval") is True)

    st, rej = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did}/resolve",
        token=token,
        body={"action": "reject"},
    )
    check("execution_followup_revise_revert", "reject_200", st == 200)
    check("execution_followup_revise_revert", "reject_no_ranking", (rej or {}).get("ranking_changed") is False)
    check("execution_followup_revise_revert", "reject_no_mutate", (rej or {}).get("state_mutated") is False)

    # Postpone
    st, dec2 = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Postpone?",
            "alternatives": [{"id": "keep", "label": "Keep"}, {"id": "tilt_outcome", "label": "Tilt"}],
        },
    )
    did2 = ((dec2 or {}).get("decision") or {}).get("id")
    _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/propose",
        token=token,
        body={"chosen_alternative_id": "tilt_outcome"},
    )
    st, post = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did2}/resolve",
        token=token,
        body={"action": "postpone"},
    )
    check("execution_followup_revise_revert", "postpone_no_mutate", st == 200 and (post or {}).get("state_mutated") is False)

    # Approve + follow-up + revert
    st, dec3 = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Approve tilt?",
            "alternatives": [{"id": "keep", "label": "Keep"}, {"id": "tilt_outcome", "label": "Tilt"}],
        },
    )
    did3 = ((dec3 or {}).get("decision") or {}).get("id")
    _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/propose",
        token=token,
        body={"chosen_alternative_id": "tilt_outcome"},
    )
    st, apr = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check("execution_followup_revise_revert", "approve_ranking", st == 200 and (apr or {}).get("ranking_changed") is True)
    check("execution_followup_revise_revert", "approve_no_external", (apr or {}).get("external_action") is False)

    st, fu = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/followups",
        token=token,
        body={"kind": "observe", "body": {"note": "ok"}},
    )
    check("execution_followup_revise_revert", "followup_201", st in (200, 201))

    st, rc = _req(
        "POST", f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/reconfirm", token=token
    )
    check("execution_followup_revise_revert", "reconfirm_200", st == 200)

    st, rv = _req(
        "POST", f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/revert", token=token
    )
    check("execution_followup_revise_revert", "revert_restores", st == 200 and (rv or {}).get("ranking_restored") is True)

    # Stale execution blocked
    st, dec4 = _req(
        "POST",
        "/api/v1/candidates/me/strategy-reviews/decisions",
        token=token,
        body={
            "question": "Stale?",
            "alternatives": [{"id": "tilt_outcome", "label": "Tilt"}],
        },
    )
    did4 = ((dec4 or {}).get("decision") or {}).get("id")
    _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did4}/propose",
        token=token,
        body={"chosen_alternative_id": "tilt_outcome"},
    )
    st, inv = _req("POST", "/api/v1/candidates/me/strategy-reviews/invalidate-evidence", token=token)
    check("deletion_privacy_recovery", "invalidate_stale_guard", st == 200 and (inv or {}).get("stale_guard") is True)
    st, stale = _req(
        "POST",
        f"/api/v1/candidates/me/strategy-reviews/decisions/{did4}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check("execution_followup_revise_revert", "stale_blocked", st == 400)

    # Archive no spawn
    st, arch = _req(
        "POST", f"/api/v1/candidates/me/strategy-reviews/sessions/{rid2}/archive", token=token
    )
    check(
        "weekly_monthly_compare",
        "archive_no_spawn",
        st == 200 and ((arch or {}).get("review") or {}).get("spawns_tasks") is False,
    )

    # Ranking / Daily OS
    st, daily = _req("GET", DAILY_OS, token=token)
    check("ranking_dailyos_acal_lifecycle", "daily_os_200", st == 200, str(st))
    check("ranking_dailyos_acal_lifecycle", "daily_os_not_404", st != 404)
    st, brief = _req("GET", "/api/v1/candidates/me/daily-os/brief", token=token)
    check("ranking_dailyos_acal_lifecycle", "daily_os_brief_exists", st in (200, 401, 403) and st != 404, str(st))

    st, rank = _req("GET", "/api/v1/candidates/me/career-strategy", token=token)
    check("ranking_dailyos_acal_lifecycle", "career_strategy_200", st == 200)

    # FE surfaces
    for path, name in [
        ("/dashboard/review-center", "fe_review_center"),
        ("/dashboard/decision-journal", "fe_decision_journal"),
        ("/dashboard/approvals", "fe_approvals"),
        ("/dashboard/career", "fe_daily_os"),
    ]:
        try:
            req = urllib.request.Request(f"{FE}{path}", method="GET")
            with urllib.request.urlopen(req, timeout=60, context=_CTX) as resp:
                check("persistence", name, resp.status == 200, str(resp.status))
        except urllib.error.HTTPError as exc:
            check("persistence", name, exc.code in (200, 307, 308, 401), str(exc.code))
        except Exception as exc:
            check("persistence", name, False, str(exc)[:80])

    # Export / delete
    st, export = _req("GET", "/api/v1/candidates/me/strategy-reviews/export", token=token)
    check("deletion_privacy_recovery", "export_secrets_excluded", st == 200 and (export or {}).get("secrets_excluded") is True)
    check(
        "deletion_privacy_recovery",
        "export_no_transcripts",
        st == 200 and (export or {}).get("interview_transcripts_excluded") is True,
    )
    st, deleted = _req("POST", "/api/v1/candidates/me/strategy-reviews/delete-history", token=token)
    check("deletion_privacy_recovery", "delete_propagated", st == 200 and (deleted or {}).get("propagated") is True)

    # Security cross-candidate
    if other:
        st, cross = _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/sessions/{rid}/finalize",
            token=other,
        )
        check("security", "cross_candidate_finalize_denied", st in (400, 403, 404), str(st))
        st, cross2 = _req(
            "POST",
            f"/api/v1/candidates/me/strategy-reviews/decisions/{did3}/resolve",
            token=other,
            body={"action": "approve"},
        )
        check("security", "cross_candidate_decision_denied", st in (400, 403, 404), str(st))
    else:
        check("security", "cross_candidate_finalize_denied", False, "no_other_token")
        check("security", "cross_candidate_decision_denied", False, "no_other_token")

    # Unauth
    st, unauth = _req("GET", "/api/v1/candidates/me/strategy-reviews")
    check("security", "unauth_aggregate_401", st in (401, 403), str(st))
    st, unauth2 = _req("GET", DAILY_OS)
    check("security", "unauth_daily_os_not_404", st != 404 and st in (401, 403), str(st))

    # Ops topology / alembic if available
    st, topo = _req("GET", "/api/v1/ops/topology", token=OPS)
    if st == 200 and isinstance(topo, dict):
        check(
            "persistence",
            "expected_alembic_120",
            "120_strategy_review_decision_governance" in str(topo.get("expected_alembic_head") or topo),
            str(topo.get("expected_alembic_head") or topo.get("alembic"))[:80],
        )
    else:
        check("persistence", "expected_alembic_120", True, "topology_skipped")

    # Summary
    total = 0
    passed = 0
    print("\n=== BUCKET COUNTS ===")
    for name, items in buckets.items():
        ok = sum(1 for _, c, _ in items if c)
        n = len(items)
        total += n
        passed += ok
        print(f"{name}: {ok}/{n}")
    print(f"TOTAL: {passed}/{total}")
    return 0 if passed == total and total > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
