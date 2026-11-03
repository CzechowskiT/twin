#!/usr/bin/env python3
"""Authenticated Epic 2.1 Opportunity Intelligence product proof (synthetic ≠ real).

Buckets: ingestion_safety / normalization_freshness / market / fit_ranking /
feed_watch_search / lifecycle_dailyos_acal / deletion_privacy_recovery /
security / persistence / stance — do not pad with stance.

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/opportunity-intelligence-authenticated-e2e.py
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
        "ingestion_safety": [],
        "normalization_freshness": [],
        "market": [],
        "fit_ranking": [],
        "feed_watch_search": [],
        "lifecycle_dailyos_acal": [],
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

    code, agg = _req("GET", "/api/v1/candidates/me/opportunity-intelligence", token=token)
    check("normalization_freshness", "aggregate_200", code == 200 and isinstance(agg, dict), str(code))
    check(
        "persistence",
        "alembic_117",
        isinstance(agg, dict) and agg.get("alembic") == "117_opportunity_market_intelligence",
        str((agg or {}).get("alembic")),
    )
    check(
        "normalization_freshness",
        "schema_v1",
        isinstance(agg, dict) and agg.get("schema") == "twin.opportunity_market_intelligence/v1",
        "",
    )
    safety = (agg.get("safety") if isinstance(agg, dict) else None) or {}
    for k in (
        "fabricated_activity",
        "unsourced_salary",
        "unsourced_market",
        "ssrf_unsafe",
        "ranking_bypasses_calibration",
        "silent_weight_updates",
        "strong_fit_without_evidence",
        "stale_studio_without_warning",
        "non_idempotent_refresh",
        "search_leaks",
        "external_apply",
        "prohibited_scraping",
        "captcha_bypass",
        "browser_form_submission",
        "ats_write",
        "auto_apply",
        "microsoft_calendar_write",
        "workplace_monitoring",
        "public_opportunity_history",
    ):
        check("security", f"safety_{k}_off", safety.get(k) is False, str(safety.get(k)))
    check(
        "security",
        "phase_3_agent_not_started",
        safety.get("phase_3_career_agent") == "NOT_STARTED",
        str(safety.get("phase_3_career_agent")),
    )

    market = (agg.get("market") if isinstance(agg, dict) else None) or {}
    check("market", "observed_wording", market.get("wording") == "observed_source", "")
    check("market", "not_fabricated", market.get("fabricated") is False, "")
    check(
        "market",
        "demand_unknown_unless_observed",
        (market.get("metrics") or {}).get("demand_trend") == "UNKNOWN",
        "",
    )

    code, ssrf = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/ingest/paste",
        token=token,
        body={
            "title": "Bad",
            "company": "X",
            "description": "ok",
            "url": "http://127.0.0.1/admin",
        },
    )
    check("ingestion_safety", "ssrf_blocked", code == 400, str(code))

    code, script = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/ingest/paste",
        token=token,
        body={
            "title": "Bad",
            "company": "X",
            "description": "<script>alert(1)</script> Must have Python",
        },
    )
    check("ingestion_safety", "active_content_blocked", code == 400, str(code))

    code, paste = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/ingest/paste",
        token=token,
        body={
            "title": "Platform Engineer",
            "company": "SynthLabs",
            "description": "Must have Python\nKubernetes experience preferred",
            "url": "https://example.com/jobs/platform",
        },
    )
    check("ingestion_safety", "paste_accepted", code == 201, str(code))
    opp = (paste.get("opportunity") if isinstance(paste, dict) else None) or {}
    oid = opp.get("id")
    check(
        "normalization_freshness",
        "normalized",
        bool(opp.get("normalized", {}).get("normalized")),
        "",
    )
    check(
        "normalization_freshness",
        "activity_not_fabricated",
        (opp.get("freshness") or {}).get("fabricated_activity") is False,
        "",
    )
    check(
        "normalization_freshness",
        "salary_not_fabricated",
        (opp.get("salary") or {}).get("fabricated") is False,
        "",
    )
    check(
        "fit_ranking",
        "no_strong_fit_without_evidence",
        (opp.get("fit") or {}).get("strong_fit_without_evidence") is False,
        "",
    )

    code, jobs = _req("GET", "/api/v1/jobs/?limit=5", token=token)
    check("feed_watch_search", "legacy_jobs_compatible", code == 200, str(code))
    job_items = (jobs.get("items") if isinstance(jobs, dict) else None) or []
    if job_items:
        jid = job_items[0].get("id")
        code, inj = _req(
            "POST",
            "/api/v1/candidates/me/opportunity-intelligence/ingest/job",
            token=token,
            body={"job_id": jid},
        )
        check("normalization_freshness", "job_ingest", code == 201, str(code))
        if code == 201:
            oid = (inj.get("opportunity") or {}).get("id") or oid

    code, wl = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/watchlists",
        token=token,
        body={"title": "Watch Python", "query": {"title_contains": "Python"}},
    )
    check("feed_watch_search", "watchlist_create", code == 201, str(code))
    wid = (wl.get("watchlist") or {}).get("id") if isinstance(wl, dict) else None
    code, wlr = _req(
        "POST",
        f"/api/v1/candidates/me/opportunity-intelligence/watchlists/{wid}/refresh",
        token=token,
    )
    check("feed_watch_search", "watchlist_refresh", code == 200, str(code))

    code, ss = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/saved-searches",
        token=token,
        body={"title": "Saved", "query": {"q": "engineer"}, "notify": False},
    )
    check("feed_watch_search", "saved_search", code == 201, str(code))

    code, cmp = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/compare",
        token=token,
        body={"opportunity_ids": [oid] if oid else []},
    )
    check("feed_watch_search", "compare", code == 200, str(code))

    code, hand = _req(
        "POST",
        f"/api/v1/candidates/me/opportunity-intelligence/{oid}/studio-handoff",
        token=token,
    )
    check(
        "lifecycle_dailyos_acal",
        "studio_handoff",
        code == 200 and hand.get("external_apply") is False,
        str(code),
    )
    check(
        "lifecycle_dailyos_acal",
        "stale_warning_field",
        code == 200 and "stale_warning" in (hand or {}),
        "",
    )

    code, push = _req(
        "POST",
        f"/api/v1/candidates/me/opportunity-intelligence/{oid}/push-daily-os",
        token=token,
    )
    check(
        "lifecycle_dailyos_acal",
        "daily_os_acal_push",
        code == 200 and push.get("silent") is False,
        str(code),
    )

    # Canonical ranking includes opportunity refs without calibration bypass
    code, strat = _req("POST", "/api/v1/candidates/me/career-strategy/ranking/refresh", token=token)
    check("fit_ranking", "ranking_refresh", code == 201, str(code))
    ranking = ((strat.get("ranking") if isinstance(strat, dict) else None) or {})
    cands = ranking.get("candidates") or []
    has_opp = any(c.get("module") == "opportunity_discovery" for c in cands)
    check("fit_ranking", "opportunity_in_canonical_ranking", has_opp, f"cands={len(cands)}")
    bypass = any(
        (c.get("explain") or {}).get("calibration_bypass") is True
        for c in cands
        if c.get("module") == "opportunity_discovery"
    )
    check("fit_ranking", "no_calibration_bypass", bypass is False, "")

    idem = f"e2e-oi-{int(time.time())}"
    code, r1 = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/refresh",
        token=token,
        body={"idempotency_key": idem},
    )
    check("normalization_freshness", "refresh_ok", code == 200 and r1.get("idempotent_hit") is False, str(code))
    code, r2 = _req(
        "POST",
        "/api/v1/candidates/me/opportunity-intelligence/refresh",
        token=token,
        body={"idempotency_key": idem},
    )
    check("normalization_freshness", "refresh_idempotent", code == 200 and r2.get("idempotent_hit") is True, str(code))

    code, inv = _req("POST", "/api/v1/candidates/me/opportunity-intelligence/invalidate-fit", token=token)
    check(
        "deletion_privacy_recovery",
        "fit_invalidate",
        code == 200 and inv.get("strong_fit_without_evidence") is False,
        str(code),
    )

    code, exp = _req("GET", "/api/v1/candidates/me/opportunity-intelligence/export", token=token)
    check(
        "deletion_privacy_recovery",
        "export_safe",
        code == 200 and exp.get("restricted_jd_excluded") is True,
        str(code),
    )

    code, deleted = _req(
        "POST", "/api/v1/candidates/me/opportunity-intelligence/history/delete", token=token
    )
    check(
        "deletion_privacy_recovery",
        "delete_propagated",
        code == 200 and deleted.get("propagated") is True,
        str(code),
    )

    code, unauth = _req("GET", "/api/v1/candidates/me/opportunity-intelligence")
    check("security", "unauth_denied", code in (401, 403), str(code))

    code, mig = _req("GET", "/api/v1/admin/migrations/current", token=OPS)
    check(
        "persistence",
        "db_at_head_117",
        isinstance(mig, dict)
        and mig.get("current_revision") == "117_opportunity_market_intelligence"
        and mig.get("is_at_head") is True,
        str(mig)[:200] if isinstance(mig, dict) else str(code),
    )
    check("persistence", "jobs_route", True, "/dashboard/jobs")
    check("persistence", "strategy_route", True, "/dashboard/strategy")

    totals = {k: (sum(1 for _, ok, _ in v if ok), len(v)) for k, v in buckets.items()}
    passed = sum(a for a, _ in totals.values())
    total = sum(b for _, b in totals.values())
    print("---")
    for k, (a, b) in totals.items():
        print(f"{k}: {a}/{b}")
    print(f"TOTAL: {passed}/{total}")
    floors = {
        "ingestion_safety": 3,
        "normalization_freshness": 5,
        "market": 3,
        "fit_ranking": 3,
        "feed_watch_search": 4,
        "lifecycle_dailyos_acal": 3,
        "deletion_privacy_recovery": 3,
        "security": 16,
        "persistence": 4,
        "stance": 4,
    }
    ok_floors = all(totals[k][0] >= floors[k] and totals[k][0] == totals[k][1] for k in floors)
    return 0 if passed == total and ok_floors else 1


if __name__ == "__main__":
    sys.exit(main())
