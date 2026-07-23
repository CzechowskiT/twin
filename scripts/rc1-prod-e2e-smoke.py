#!/usr/bin/env python3
"""RC1 multi-persona prod E2E smoke — never prints secrets."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = os.environ.get("TWIN_PROD_API_BASE_URL", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_PROD_FE_BASE_URL", "https://twin-sooty.vercel.app").rstrip("/")
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
        print(("PASS" if cond else "FAIL"), name, detail[:140])

    code, raw = req("GET", f"{API}/api/v1/health")
    health = json.loads(raw) if raw.startswith(b"{") else {}
    ok("api_health", code == 200 and health.get("status") == "ok", str(health.get("git_commit", ""))[:12])

    code, raw = req("GET", f"{FE}/login/candidate")
    ok("fe_candidate_login", code == 200 and len(raw) > 1000, f"len={len(raw)}")

    pw = env.get("DEMO_USER_PASSWORD", "")
    code, raw = req("POST", f"{API}/api/v1/auth/login/json", data={"email": "demo@twin.career", "password": pw})
    ok("cand_login", code == 200)
    tok = json.loads(raw).get("access_token") if code == 200 else None
    H = {"Authorization": f"Bearer {tok}"} if tok else {}

    if tok:
        for path, name in [
            ("/api/v1/candidates/me", "cand_me"),
            ("/api/v1/investor/data-room/storage-status", "inv_storage"),
            ("/api/v1/platform/wave4/board/readiness", "inv_board"),
            ("/api/v1/integrations/ats/status", "ats_status"),
        ]:
            c, r = req("GET", f"{API}{path}", headers=H)
            detail = ""
            if name == "inv_board" and c == 200:
                b = json.loads(r)
                detail = f"held={b.get('wave4_held_modules')} gate={b.get('gate_f')} launch={b.get('launch')}"
                ok(name, b.get("launch") == "NO-GO" and b.get("wave4_held_modules") == 0, detail)
            elif name == "inv_storage" and c == 200:
                b = json.loads(r)
                ok(name, b.get("persistent") is True, b.get("persistent_backend", ""))
            else:
                ok(name, c in (200, 404), f"http={c}")

    rt = (env.get("RECRUITER_INBOX_TOKEN") or env.get("RECRUITER_TOKEN") or "").strip()
    ok("rec_token_present", len(rt) >= 32, f"sha12={hashlib.sha256(rt.encode()).hexdigest()[:12] if rt else '-'}")
    if rt:
        c, r = req(
            "POST",
            f"{API}/api/v1/auth/recruiter/session",
            data={"access_token": rt, "company_slug": "nova-hiring-pl"},
        )
        ok("rec_session", c == 200, f"http={c}")
        if c == 200:
            jwt = json.loads(r)["access_token"]
            RH = {"Authorization": f"Bearer {jwt}"}
            for path, name in [
                ("/api/v1/recruiter/inbox?company_slug=nova-hiring-pl&limit=3", "rec_inbox"),
                ("/api/v1/recruiter/pipeline?company_slug=nova-hiring-pl", "rec_pipeline"),
            ]:
                c2, _ = req("GET", f"{API}{path}", headers=RH)
                ok(name, c2 == 200, f"http={c2}")

    c, _ = req("GET", f"{API}/api/v1/admin/ops/status")
    ok("admin_unauth", c in (401, 403, 404), f"http={c}")

    fails = [n for n, p, _ in results if not p]
    print("SUMMARY", f"{sum(1 for _, p, _ in results if p)}/{len(results)}", "FAILS", fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
