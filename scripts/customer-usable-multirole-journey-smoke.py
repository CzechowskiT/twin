#!/usr/bin/env python3
"""Customer-usable MULTI-ROLE journey smoke (synthetic tenants only).

Journey A–F:
  A company role create
  B CSV import + assign to role (applications)
  C inbox review
  D human accept/decline
  E company pipeline-quality visibility
  F audit + product feedback
  + second tenant isolation / tenant_mismatch

Never prints secrets. Labels all data as SYNTHETIC ≠ real pilot KPI.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("TWIN_PROD_API_BASE_URL", "https://twin-production-bcd9.up.railway.app").rstrip("/")
TENANT_A = os.environ.get("TWIN_CU_TENANT_A", "cu-pilot-alpha").strip() or "cu-pilot-alpha"
TENANT_B = os.environ.get("TWIN_CU_TENANT_B", "cu-pilot-beta").strip() or "cu-pilot-beta"
ROOT = Path(__file__).resolve().parents[1]


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for p in (ROOT / "frontend" / ".env.local", ROOT / ".env.local"):
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def req(method: str, url: str, *, headers: dict | None = None, data: dict | None = None):
    h = dict(headers or {})
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main() -> int:
    env = load_env()
    results: list[tuple[str, bool, str]] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        results.append((name, cond, detail))
        print(("PASS" if cond else "FAIL"), name, detail[:180])

    rt = (env.get("RECRUITER_INBOX_TOKEN") or env.get("RECRUITER_TOKEN") or "").strip()
    ok("rec_token_present", len(rt) >= 32, f"sha12={hashlib.sha256(rt.encode()).hexdigest()[:12] if rt else '-'}")
    if len(rt) < 32:
        return 1

    def session(slug: str) -> str | None:
        c, raw = req(
            "POST",
            f"{API}/api/v1/auth/recruiter/session",
            data={"access_token": rt, "company_slug": slug},
        )
        if c != 200:
            return None
        return json.loads(raw)["access_token"]

    jwt_a = session(TENANT_A)
    ok("session_tenant_a", jwt_a is not None, TENANT_A)
    jwt_b = session(TENANT_B)
    ok("session_tenant_b", jwt_b is not None, TENANT_B)
    if not jwt_a or not jwt_b:
        return 1

    ha = {"Authorization": f"Bearer {jwt_a}", "X-Locale": "en"}
    hb = {"Authorization": f"Bearer {jwt_b}", "X-Locale": "en"}

    # Isolation: JWT A must not query tenant B
    c, _ = req("GET", f"{API}/api/v1/recruiter/inbox?company_slug={TENANT_B}&limit=1", headers=ha)
    ok("tenant_mismatch_blocked", c in (400, 403), f"http={c}")

    # A — create company role
    stamp = int(time.time())
    c, raw = req(
        "POST",
        f"{API}/api/v1/company/roles?company_slug={TENANT_A}",
        headers=ha,
        data={
            "title": f"CU MultiRole Engineer {stamp}",
            "status": "active",
            "location": "Remote",
            "description": "SYNTHETIC multi-role journey role — not a real customer vacancy",
        },
    )
    role = json.loads(raw) if raw.startswith(b"{") else {}
    role_id = role.get("id")
    ok("A_company_role_create", c in (200, 201) and bool(role_id), f"http={c} id={role_id}")
    if not role_id:
        return 1

    # B — CSV import preview + commit with assign
    csv_text = (
        "display_name,job_title,location,skills,external_ats_id\n"
        f"CU Synthetic Cand {stamp},Engineer,Remote,Python;FastAPI,cu-ext-{stamp}\n"
    )
    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/talent-pool/import/preview?company_slug={TENANT_A}",
        headers=ha,
        data={"csv_text": csv_text, "import_source": "cu_multirole_smoke"},
    )
    preview = json.loads(raw) if raw.startswith(b"{") else {}
    import_id = preview.get("import_id")
    ok("B_csv_import_preview", c == 200 and bool(import_id), f"http={c} import_id={import_id}")
    if not import_id:
        return 1

    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/talent-pool/import/commit?company_slug={TENANT_A}",
        headers=ha,
        data={"import_id": import_id, "job_id": role_id},
    )
    committed = json.loads(raw) if raw.startswith(b"{") else {}
    assigned_count = int(committed.get("assigned_count") or 0)
    app_id = None
    for a in committed.get("assigned") or []:
        if a.get("application_id"):
            app_id = int(a["application_id"])
            break
    ok(
        "B_csv_commit_assign",
        c == 200 and assigned_count >= 1 and app_id is not None,
        f"http={c} assigned={assigned_count} app={app_id}",
    )
    if not app_id:
        return 1

    # Tenant B role + manual candidate (second synthetic tenant path)
    c, raw = req(
        "POST",
        f"{API}/api/v1/company/roles?company_slug={TENANT_B}",
        headers=hb,
        data={
            "title": f"CU Beta Role {stamp}",
            "status": "active",
            "location": "Remote",
            "description": "SYNTHETIC tenant B role",
        },
    )
    role_b = json.loads(raw) if raw.startswith(b"{") else {}
    role_b_id = role_b.get("id")
    ok("B2_tenant_b_role", c in (200, 201) and bool(role_b_id), f"http={c}")
    if role_b_id:
        c, raw = req(
            "POST",
            f"{API}/api/v1/recruiter/talent-pool/candidates?company_slug={TENANT_B}",
            headers=hb,
            data={
                "display_name": f"Beta Cand {stamp}",
                "job_title": "Analyst",
                "location": "Remote",
                "skills": ["SQL"],
                "job_id": role_b_id,
                "external_ats_id": f"beta-{stamp}",
            },
        )
        body = json.loads(raw) if raw.startswith(b"{") else {}
        ok(
            "B2_tenant_b_manual_assign",
            c in (200, 201) and bool((body.get("application") or {}).get("application_id")),
            f"http={c}",
        )

    # C — inbox review contains app
    c, raw = req(
        "GET",
        f"{API}/api/v1/recruiter/inbox?company_slug={TENANT_A}&limit=50",
        headers=ha,
    )
    inbox = json.loads(raw) if raw.startswith(b"{") else {}
    items = inbox.get("items") or []
    found = next((i for i in items if int(i.get("application_id") or 0) == app_id), None)
    ok("C_inbox_review", c == 200 and found is not None, f"http={c} found={bool(found)}")

    # Isolation: B inbox must not contain A's application
    c, raw = req(
        "GET",
        f"{API}/api/v1/recruiter/inbox?company_slug={TENANT_B}&limit=50",
        headers=hb,
    )
    items_b = (json.loads(raw).get("items") if raw.startswith(b"{") else None) or []
    leak = any(int(i.get("application_id") or 0) == app_id for i in items_b)
    ok("C_tenant_isolation_no_leak", c == 200 and not leak, f"http={c} leak={leak}")

    # D — human decision
    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/inbox/{app_id}/respond?company_slug={TENANT_A}",
        headers=ha,
        data={"action": "accept"},
    )
    body = json.loads(raw) if raw.startswith(b"{") else {}
    ok("D_decision_accept", c == 200 and body.get("status") == "interview", f"http={c} {body.get('status')}")

    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/pipeline/{app_id}/transition?company_slug={TENANT_A}",
        headers=ha,
        data={"action": "to_contact"},
    )
    ok("D_pipeline_transition", c == 200, f"http={c}")

    # E — company visibility
    c, raw = req(
        "GET",
        f"{API}/api/v1/company/pipeline-quality?company_slug={TENANT_A}",
        headers=ha,
    )
    pq = json.loads(raw) if raw.startswith(b"{") else {}
    ok("E_company_pipeline_visibility", c == 200 and isinstance(pq, dict), f"http={c} keys={list(pq)[:6]}")

    # F — audit trail
    c, raw = req(
        "GET",
        f"{API}/api/v1/recruiter/inbox/{app_id}/audit?company_slug={TENANT_A}",
        headers=ha,
    )
    audit = json.loads(raw) if raw.startswith(b"{") else {}
    events = audit.get("events") or audit.get("items") or []
    ok("F_audit_trail", c == 200 and len(events) >= 1, f"http={c} events={len(events)}")

    c, raw = req(
        "GET",
        f"{API}/api/v1/company/audit-log?company_slug={TENANT_A}&limit=10",
        headers=ha,
    )
    ok("F_company_audit_log", c == 200, f"http={c}")

    # Feedback via candidate demo user (authenticated product feedback)
    pw = env.get("DEMO_USER_PASSWORD", "")
    c, raw = req("POST", f"{API}/api/v1/auth/login/json", data={"email": "demo@twin.career", "password": pw})
    tok = json.loads(raw).get("access_token") if c == 200 else None
    ok("F_cand_login_for_feedback", bool(tok), f"http={c}")
    if tok:
        c, raw = req(
            "POST",
            f"{API}/api/v1/feedback",
            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"},
            data={
                "category": "pilot",
                "rating": 5,
                "message": "SYNTHETIC multi-role journey smoke feedback — not real customer NPS",
                "page_path": "/recruiter/inbox",
                "feedback_type": "suggestion",
                "workflow_key": "cu_multirole_journey",
                "tags": ["synthetic", "multirole_smoke"],
            },
        )
        ok("F_feedback_persist", c in (200, 201), f"http={c}")

    # Org settings write (company surface)
    c, _ = req(
        "PUT",
        f"{API}/api/v1/company/org-settings?company_slug={TENANT_A}",
        headers=ha,
        data={"display_name": f"CU Alpha Synth {stamp}", "timezone": "Europe/Warsaw"},
    )
    ok("A_org_settings_write", c == 200, f"http={c}")

    fails = [n for n, p, _ in results if not p]
    print(
        "SUMMARY",
        f"{sum(1 for _, p, _ in results if p)}/{len(results)}",
        "FAILS",
        fails,
    )
    print(
        "JOURNEY",
        "company_recruiter_candidate_multirole",
        "SYNTHETIC_ONLY",
        "CUSTOMER_USABLE" if not fails else "BLOCKED",
    )
    print("LABEL", "production_smoked_synthetic≠real_customer_validated≠real_pilot_data")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
