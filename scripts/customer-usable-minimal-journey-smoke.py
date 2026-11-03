#!/usr/bin/env python3
"""Customer-usable minimal journey smoke — recruiter inbox accept/decline.

Requires writable production path on synthetic tenant (nova-hiring-pl).
Never prints secrets / JWTs. Exit 0 only when mutation persists.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("TWIN_PROD_API_BASE_URL", "https://twin-production-bcd9.up.railway.app").rstrip("/")
COMPANY = os.environ.get("TWIN_PROD_SMOKE_COMPANY_SLUG", "nova-hiring-pl").strip() or "nova-hiring-pl"
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
        with urllib.request.urlopen(r, timeout=45) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main() -> int:
    env = load_env()
    results: list[tuple[str, bool, str]] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        results.append((name, cond, detail))
        print(("PASS" if cond else "FAIL"), name, detail[:160])

    rt = (env.get("RECRUITER_INBOX_TOKEN") or env.get("RECRUITER_TOKEN") or "").strip()
    ok("rec_token_present", len(rt) >= 32, f"sha12={hashlib.sha256(rt.encode()).hexdigest()[:12] if rt else '-'}")
    if len(rt) < 32:
        print("SUMMARY", "blocked_no_token")
        return 1

    c, raw = req(
        "POST",
        f"{API}/api/v1/auth/recruiter/session",
        data={"access_token": rt, "company_slug": COMPANY},
    )
    ok("rec_session", c == 200, f"http={c}")
    if c != 200:
        return 1
    jwt = json.loads(raw)["access_token"]
    headers = {"Authorization": f"Bearer {jwt}", "X-Locale": "en"}

    c, raw = req("GET", f"{API}/api/v1/recruiter/inbox?company_slug={COMPANY}&limit=25", headers=headers)
    ok("rec_inbox", c == 200, f"http={c}")
    if c != 200:
        return 1
    payload = json.loads(raw)
    items = payload.get("items") or []
    ok("rec_inbox_has_items", len(items) >= 1, f"total={payload.get('total', len(items))}")
    if not items:
        return 1

    # Prefer rejected → accept → decline (net restore) for synthetic tenant.
    target = next((i for i in items if (i.get("status") or "").lower() == "rejected"), None)
    restore = True
    if not target:
        target = next((i for i in items if (i.get("status") or "").lower() in {"applied", "pending"}), None)
        restore = False
    ok("rec_target_selected", target is not None, "")
    if not target:
        return 1

    app_id = int(target["application_id"])
    before = (target.get("status") or "").lower()

    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/inbox/{app_id}/respond?company_slug={COMPANY}",
        headers=headers,
        data={"action": "accept"},
    )
    body = json.loads(raw) if raw.startswith(b"{") else {}
    ok("rec_respond_accept", c == 200 and body.get("status") == "interview", f"http={c} status={body.get('status')}")
    if c != 200:
        return 1

    c, raw = req(
        "POST",
        f"{API}/api/v1/recruiter/inbox/{app_id}/respond?company_slug={COMPANY}",
        headers=headers,
        data={"action": "decline", "decline_note": "customer_usable_minimal_journey_smoke"},
    )
    body = json.loads(raw) if raw.startswith(b"{") else {}
    ok("rec_respond_decline", c == 200 and body.get("status") == "rejected", f"http={c} status={body.get('status')}")

    c, raw = req("GET", f"{API}/api/v1/recruiter/inbox?company_slug={COMPANY}&limit=25", headers=headers)
    ok("rec_inbox_reload", c == 200, f"http={c}")
    if c == 200:
        items2 = json.loads(raw).get("items") or []
        found = next((i for i in items2 if int(i.get("application_id") or 0) == app_id), None)
        persisted = found is not None and (found.get("status") or "").lower() == "rejected"
        ok("rec_decision_persisted", persisted, f"app_id={app_id} before={before} restore={restore}")

    fails = [n for n, p, _ in results if not p]
    print("SUMMARY", f"{sum(1 for _, p, _ in results if p)}/{len(results)}", "FAILS", fails)
    print("JOURNEY", "recruiter_inbox_accept_decline", "CUSTOMER_USABLE" if not fails else "BLOCKED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
