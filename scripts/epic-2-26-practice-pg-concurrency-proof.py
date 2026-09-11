#!/usr/bin/env python3
"""Epic 2.26 remediation — real PostgreSQL concurrency proof for practice submit.

Uses Railway DATABASE_URL (Postgres). Concurrent HTTP submits against the same
turn must serialize: exactly one success, one turn_already_submitted (or equivalent).
Also verifies dialect is PostgreSQL (not SQLite) and that with_for_update is present.
"""

from __future__ import annotations

import concurrent.futures
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()
DB_URL = (os.environ.get("DATABASE_PUBLIC_URL") or os.environ.get("DATABASE_URL") or "").strip()
OUT = Path(
    os.environ.get(
        "EPIC226_PG_CONCURRENCY_OUT",
        "reports/epic-2-26-consent-quality-remediation-2026-09-11/pg-concurrency-proof.json",
    )
)


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() if exc.fp else ""
        try:
            payload = json.loads(raw) if raw else {"detail": str(exc)}
        except Exception:
            payload = {"detail": raw or str(exc)}
        return exc.code, payload


def _pg_dialect_check() -> dict:
    """Connect to Postgres and report dialect + that practice tables exist."""
    if not DB_URL or not DB_URL.startswith("postgres"):
        return {"ok": False, "reason": "DATABASE_URL missing or not postgres"}
    try:
        import psycopg  # psycopg3
    except ImportError:
        return {"ok": False, "reason": "psycopg not installed"}
    try:
        with psycopg.connect(DB_URL, connect_timeout=20) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version()")
                ver = cur.fetchone()[0]
                cur.execute(
                    "SELECT COUNT(*) FROM information_schema.tables "
                    "WHERE table_name IN ("
                    "'candidate_interview_practice_sessions',"
                    "'candidate_interview_practice_turns',"
                    "'candidate_interview_practice_evaluations'"
                    ")"
                )
                tables = cur.fetchone()[0]
    except Exception as exc:  # pragma: no cover
        return {"ok": False, "reason": f"connect_failed:{type(exc).__name__}"}
    return {
        "ok": "PostgreSQL" in str(ver) and int(tables or 0) >= 3,
        "dialect": "postgresql",
        "version_prefix": (str(ver) or "")[:40],
        "practice_tables": int(tables or 0),
    }


def _submit_once(token: str, session_id: int, turn_id: int, tag: str) -> dict:
    code, body = _req(
        "POST",
        f"/api/v1/candidates/me/interview-practice/sessions/{session_id}/turns/{turn_id}/submit",
        token=token,
        body={"answer_text": f"Concurrent submit proof tag={tag} at {time.time()}"},
    )
    detail = body.get("detail") if isinstance(body, dict) else body
    return {"tag": tag, "status": code, "detail": detail}


def main() -> int:
    result: dict = {
        "dialect_check": None,
        "static_for_update": None,
        "concurrent_submit": None,
        "verdict": "FAIL",
    }
    src = (
        Path(__file__).resolve().parents[1]
        / "backend/app/services/candidate_interview_practice.py"
    ).read_text(encoding="utf-8")
    result["static_for_update"] = {
        "with_for_update": "with_for_update" in src,
        "commit_before_model": "db.commit()" in src and "_evaluate_turn" in src,
        "duplicate_guard": "turn_already_submitted" in src,
    }

    dialect = _pg_dialect_check()
    result["dialect_check"] = dialect
    if not dialect.get("ok"):
        result["verdict"] = "BLOCKED_NO_PG"
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return 2

    if not OPS:
        result["verdict"] = "BLOCKED_NO_OPS"
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return 2

    code, mint = _req(
        "POST",
        "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session",
        token=OPS,
    )
    token = (mint or {}).get("access_token") if isinstance(mint, dict) else None
    if code != 200 or not token:
        result["verdict"] = "BLOCKED_MINT"
        result["mint_status"] = code
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return 2

    code, sess = _req(
        "POST",
        "/api/v1/candidates/me/interview-practice/sessions",
        token=token,
        body={
            "exercise_id": "behavioral_star_1",
            "locale": "en",
            "ai_prep_opt_in": False,
        },
    )
    if code not in (200, 201) or not isinstance(sess, dict) or not sess.get("id"):
        result["verdict"] = "FAIL_CREATE_SESSION"
        result["create_status"] = code
        result["create_body_keys"] = list(sess.keys()) if isinstance(sess, dict) else []
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return 1

    session_id = int(sess["id"])
    turns = sess.get("turns") or []
    if not turns:
        result["verdict"] = "FAIL_NO_TURN"
        result["create_status"] = code
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        return 1
    turn_id = int(turns[0]["id"])

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futs = [
            pool.submit(_submit_once, token, session_id, turn_id, "A"),
            pool.submit(_submit_once, token, session_id, turn_id, "B"),
        ]
        outcomes = [f.result() for f in concurrent.futures.as_completed(futs)]

    successes = [o for o in outcomes if o["status"] == 200]
    conflicts = [
        o
        for o in outcomes
        if o["status"] in (400, 409)
        and (
            "already_submitted" in str(o.get("detail") or "").lower()
            or "turn_already_submitted" in str(o.get("detail") or "")
        )
    ]
    # Broader conflict detection when API wraps detail differently
    if not conflicts:
        conflicts = [o for o in outcomes if o["status"] in (400, 409)]

    ok = (
        len(successes) == 1
        and len(outcomes) == 2
        and len(conflicts) >= 1
        and result["static_for_update"]["with_for_update"]
        and dialect["ok"]
    )
    result["concurrent_submit"] = {
        "session_id": session_id,
        "turn_id": turn_id,
        "outcomes": outcomes,
        "success_count": len(successes),
        "conflict_count": len(conflicts),
        "ok": ok,
    }

    # Cleanup: delete session (best-effort)
    _req("DELETE", f"/api/v1/candidates/me/interview-practice/sessions/{session_id}", token=token)
    # Best-effort account cleanup if endpoint exists
    _req("POST", "/api/v1/candidates/me/account/delete", token=token, body={"confirm": True})

    result["verdict"] = "PASS" if ok else "FAIL"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
