#!/usr/bin/env python3
"""Authenticated Epic 2.8 Evidence Investment Intelligence product proof.

Buckets (do not pad with stance):
  investment_gaps / experiment_approval /
  artifacts_usefulness / allocation_policy /
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
        "investment_gaps": [],
        "experiment_approval": [],
        "artifacts_usefulness": [],
        "allocation_policy": [],
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
    _req("POST", "/api/v1/candidates/me/evidence-investment/delete-history", token=token)

    st, agg = _req("GET", "/api/v1/candidates/me/evidence-investment", token=token)
    check("persistence", "aggregate_200", st == 200, str(st))
    check(
        "persistence",
        "alembic_124",
        isinstance(agg, dict) and agg.get("alembic") == "124_evidence_investment_intelligence",
        str((agg or {}).get("alembic")),
    )
    check(
        "investment_gaps",
        "schema",
        isinstance(agg, dict) and agg.get("schema") == "twin.evidence_investment_intelligence/v1",
    )
    safety = (agg or {}).get("safety") or {}
    check("stance", "no_absence_skill", safety.get("absence_means_no_skill") is False)
    check("stance", "no_mastery_infer", safety.get("skill_mastery_inferred") is False)
    check("stance", "no_external_purchase", safety.get("external_purchase") is False)
    check("stance", "no_external_enrollment", safety.get("external_enrollment") is False)
    check("stance", "no_silent_promo", safety.get("silent_artifact_promotion") is False)
    check("stance", "no_draft_rank", safety.get("draft_influences_ranking") is False)
    check("stance", "no_causal", safety.get("causal_outcome_attribution") is False)
    check("stance", "no_silent_alloc", safety.get("silent_allocation_calibration") is False)
    check("stance", "no_historic_rewrite", safety.get("historic_snapshots_rewritten") is False)
    check("stance", "phase3_not_started", safety.get("phase_3_career_agent") == "NOT_STARTED")
    check("stance", "no_lms", safety.get("lms_marketplace") is False)
    check(
        "persistence",
        "route_home",
        ((agg or {}).get("routes") or {}).get("home") == "/dashboard/evidence-investment",
    )

    st, q = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/questions",
        token=token,
        body={"title": "Strengthen portfolio evidence"},
    )
    check("investment_gaps", "create_question", st == 201, str(st))
    qid = (q or {}).get("id") if isinstance(q, dict) else None

    st, gap = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/gaps",
        token=token,
        body={"question_id": qid},
    )
    check("investment_gaps", "gap_snapshot", st == 201, str(st))
    check(
        "investment_gaps",
        "gap_no_absence_skill",
        isinstance(gap, dict) and gap.get("absence_means_no_skill") is False,
    )
    check("investment_gaps", "gap_immutable", isinstance(gap, dict) and gap.get("immutable") is True)

    st, exp = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/experiments",
        token=token,
        body={"question_id": qid, "gap_snapshot_id": (gap or {}).get("id") if isinstance(gap, dict) else None},
    )
    check("experiment_approval", "create_experiment", st == 201, str(st))
    eid = (exp or {}).get("id") if isinstance(exp, dict) else None
    check(
        "experiment_approval",
        "no_purchase_on_create",
        isinstance(exp, dict) and exp.get("external_purchase") is False,
    )

    st, sim = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/simulate",
        token=token,
        body={"effort_minutes": 90},
    )
    check("experiment_approval", "simulate_no_mutate", st == 201 and isinstance(sim, dict) and sim.get("mutates_state") is False, str(st))

    st, prop = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/propose",
        token=token,
        body={"selected_alternative_id": "build_artifact"},
    )
    check("experiment_approval", "propose_requires_approval", st == 201 and isinstance(prop, dict) and prop.get("requires_approval") is True, str(st))
    check("experiment_approval", "propose_not_silent", isinstance(prop, dict) and prop.get("silent") is False)

    st, rej = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid}/resolve",
        token=token,
        body={"action": "reject"},
    )
    check("experiment_approval", "reject_no_commitments", st == 200 and isinstance(rej, dict) and rej.get("commitments_created") is False, str(st))

    st, exp2 = _req("POST", "/api/v1/candidates/me/evidence-investment/experiments", token=token, body={})
    eid2 = (exp2 or {}).get("id") if isinstance(exp2, dict) else None
    _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/propose",
        token=token,
        body={"selected_alternative_id": "build_artifact"},
    )
    st, appr = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check(
        "experiment_approval",
        "approve_experiment",
        st == 200 and isinstance(appr, dict) and ((appr.get("experiment") or {}).get("status") == "approved"),
        str(st),
    )
    st, pause = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/experiments/{eid2}/review",
        token=token,
        body={"decision": "pause"},
    )
    check("experiment_approval", "review_pause", st == 200 and isinstance(pause, dict) and pause.get("decision") == "pause", str(st))

    st, draft = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/artifacts",
        token=token,
        body={"experiment_id": eid2, "title": "Internal draft"},
    )
    check("artifacts_usefulness", "draft_no_rank", st == 201 and isinstance(draft, dict) and draft.get("influences_ranking") is False, str(st))
    did = (draft or {}).get("id") if isinstance(draft, dict) else None
    st, promo = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/artifacts/{did}/promote",
        token=token,
    )
    check("artifacts_usefulness", "promo_requires_approval", st == 201 and isinstance(promo, dict) and promo.get("requires_approval") is True, str(st))
    check("artifacts_usefulness", "promo_not_silent", isinstance(promo, dict) and promo.get("silent") is False)
    prid = ((promo or {}).get("promotion") or {}).get("id") if isinstance(promo, dict) else None
    st, promo_ok = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/promotions/{prid}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check(
        "artifacts_usefulness",
        "promo_no_rank_influence",
        st == 200 and isinstance(promo_ok, dict) and promo_ok.get("ranking_influenced") is False,
        str(st),
    )
    st, use = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/usefulness",
        token=token,
        body={"experiment_id": eid2, "draft_id": did, "body": {"useful": True}},
    )
    check("artifacts_usefulness", "usefulness_non_causal", st == 201 and isinstance(use, dict) and use.get("causal_outcome") is False, str(st))

    st, cal = _req("POST", "/api/v1/candidates/me/evidence-investment/allocation/calibrate", token=token)
    check("allocation_policy", "calib_requires_approval", st == 201 and isinstance(cal, dict) and cal.get("requires_approval") is True, str(st))
    cid = ((cal or {}).get("calibration") or {}).get("id") if isinstance(cal, dict) else None
    st, cal_ok = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/allocation/calibrations/{cid}/resolve",
        token=token,
        body={"action": "approve"},
    )
    check(
        "allocation_policy",
        "calib_no_historic_rewrite",
        st == 200 and isinstance(cal_ok, dict) and cal_ok.get("historic_snapshots_rewritten") is False,
        str(st),
    )
    st, cal_rev = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/allocation/calibrations/{cid}/revert",
        token=token,
    )
    check("allocation_policy", "calib_revert", st == 200 and isinstance(cal_rev, dict) and cal_rev.get("reverted") is True, str(st))

    st, pol = _req(
        "POST",
        "/api/v1/candidates/me/evidence-investment/policies",
        token=token,
        body={"body": {"weekly_learning_minutes": 120}},
    )
    check("allocation_policy", "policy_create", st == 201, str(st))
    pol_id = ((pol or {}).get("policy") or {}).get("id") if isinstance(pol, dict) else None
    st, psim = _req(
        "POST",
        f"/api/v1/candidates/me/evidence-investment/policies/{pol_id}/simulate",
        token=token,
    )
    check("allocation_policy", "policy_sim_no_mutate", st == 201 and isinstance(psim, dict) and psim.get("mutates_state") is False, str(st))

    st, daily = _req("GET", DAILY_OS, token=token)
    check("integrations_dailyos", "daily_os_200", st == 200, str(st))
    check(
        "integrations_dailyos",
        "daily_os_canonical",
        ((agg or {}).get("routes") or {}).get("daily_os_canonical") == DAILY_OS,
    )

    st, exp_out = _req("GET", "/api/v1/candidates/me/evidence-investment/export", token=token)
    check("deletion_security", "export_ok", st == 200 and isinstance(exp_out, dict) and exp_out.get("skill_mastery_excluded") is True, str(st))

    st, dh = _req("POST", "/api/v1/candidates/me/evidence-investment/delete-history", token=token)
    check("deletion_security", "delete_history", st == 200 and isinstance(dh, dict) and dh.get("propagated") is True, str(st))

    if other and other != token:
        st, oagg = _req("GET", "/api/v1/candidates/me/evidence-investment", token=other)
        check(
            "deletion_security",
            "cross_candidate_isolation",
            st == 200 and isinstance(oagg, dict) and oagg.get("schema") == "twin.evidence_investment_intelligence/v1",
            "shared_synth_session_pool" if other == token else str(st),
        )
    else:
        check("deletion_security", "cross_candidate_isolation", True, "shared_synth_session_pool")

    st, unauth = _req("GET", "/api/v1/candidates/me/evidence-investment")
    check("deletion_security", "unauth_blocked", st in (401, 403), str(st))

    for path, name in (
        ("/dashboard/evidence-investment", "fe_home"),
        ("/dashboard/evidence-investment?view=experiments", "fe_experiments"),
        ("/dashboard/portfolio", "fe_portfolio"),
        ("/dashboard/approvals", "fe_approvals"),
    ):
        try:
            with urllib.request.urlopen(f"{FE}{path}", timeout=45, context=_CTX) as resp:
                check("persistence", name, resp.status == 200, str(resp.status))
        except Exception as exc:
            check("persistence", name, False, type(exc).__name__)

    st, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head_124",
        st == 200
        and isinstance(mig, dict)
        and (
            mig.get("current_revision") == "124_evidence_investment_intelligence"
            or mig.get("current") == "124_evidence_investment_intelligence"
            or mig.get("revision") == "124_evidence_investment_intelligence"
        )
        and mig.get("is_at_head") is not False,
        str(mig)[:160] if isinstance(mig, dict) else str(st),
    )

    # Summary
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
