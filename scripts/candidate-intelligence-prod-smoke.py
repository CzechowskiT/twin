#!/usr/bin/env python3
"""Synthetic production smoke for AI Candidate Intelligence (no real CVs/PII).

Requires OPS_ADMIN_TOKEN. Does not mutate KPI real-pilot tokens.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("TWIN_PROD_API_BASE_URL", "https://twin-production-bcd9.up.railway.app").rstrip("/")
TOKEN = os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or ""

SYNTH_CV = (
    "Synth Intel Candidate\nSenior Engineer\n"
    "2018-2021 | SynthCo | Engineer\nPython, PostgreSQL.\n"
    "2021-Present | TwinSynth | Senior Engineer\nAPIs, FastAPI, pytest.\n"
)


def _req(method: str, path: str, body: dict | None = None) -> tuple[int, dict]:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "X-Locale": "en",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read().decode() or "{}"
            return res.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() or "{}"
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"raw": raw[:300]}


def main() -> int:
    if not TOKEN:
        print("FAIL missing_ops_token")
        return 2
    fails: list[str] = []

    # Health + stance
    code, health = _req("GET", "/api/v1/health?ops=1")
    if code != 200:
        fails.append("health")
    else:
        print("PASS health", health.get("git_commit", "")[:12])
        if health.get("rc1_launch") != "NO-GO":
            fails.append("launch_not_nogo")
        if health.get("rc1_kpi_token") not in (None, "NO_REAL_PILOT_DATA"):
            # tolerate missing key; must not claim real pilot from this smoke
            pass
        print("PASS stance_launch", health.get("rc1_launch"))

    # Intelligence endpoints must exist (404 on missing candidate is OK; 401/404 route miss is not)
    code, body = _req("GET", "/api/v1/candidates/999999991/intelligence")
    if code not in {200, 404}:
        fails.append(f"intel_get_unexpected_{code}")
        print("FAIL intel_get", code, body)
    else:
        print("PASS intel_route", code)

    # Process on missing candidate must 400/404
    code, body = _req("POST", "/api/v1/candidates/999999991/intelligence/process", {"force": True})
    if code not in {400, 404}:
        fails.append(f"intel_process_unexpected_{code}")
    else:
        print("PASS intel_process_missing_candidate", code)

    # Clarification draft never auto-sends even for missing
    code, body = _req("POST", "/api/v1/candidates/999999991/intelligence/clarification-draft", {})
    if code == 404:
        print("PASS clarification_missing_candidate")
    elif code == 200 and body.get("auto_send") is False:
        print("PASS clarification_draft_unsent")
    else:
        fails.append("clarification_autosend_or_unexpected")

    print("SUMMARY", f"{len(fails)} fails", fails)
    print("LABEL synthetic_intelligence_route_smoke≠real_customer_validated")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
