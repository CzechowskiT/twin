#!/usr/bin/env python3
"""Epic 2.12 — authenticated synthetic Import Center E2E (no real PII).

Buckets: product / stance (reported separately).
Requires OPS_ADMIN_TOKEN for mint-synthetic-session.

Usage:
  OPS_ADMIN_TOKEN=… python3 scripts/epic-2-12-import-authenticated-e2e.py
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from io import BytesIO

try:
    import certifi

    _CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:  # pragma: no cover
    _CTX = ssl.create_default_context()

API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")
FE = os.environ.get("TWIN_FE_BASE", "https://twin-sooty.vercel.app").rstrip("/")
OPS = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()

product: list[tuple[str, bool, str]] = []
stance: list[tuple[str, bool, str]] = []


def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
    row = (name, bool(cond), detail[:200])
    (product if bucket == "product" else stance).append(row)
    print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:120])


def _req(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    raw: bytes | None = None,
    content_type: str | None = None,
):
    data = raw
    headers: dict[str, str] = {"X-Locale": "en"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if content_type:
        headers["Content-Type"] = content_type
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw_out = resp.read().decode("utf-8", errors="replace") or "{}"
            try:
                return resp.status, json.loads(raw_out)
            except json.JSONDecodeError:
                return resp.status, raw_out[:400]
    except urllib.error.HTTPError as exc:
        raw_out = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw_out)
        except json.JSONDecodeError:
            return exc.code, raw_out[:400]


def _multipart_upload(token: str, batch_key: str, content: bytes, filename: str) -> tuple[int, dict]:
    boundary = f"----twin{int(time.time())}"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    return _req(
        "POST",
        f"/api/v1/candidates/me/import/batches/{batch_key}/upload",
        token=token,
        raw=body,
        content_type=f"multipart/form-data; boundary={boundary}",
    )


def main() -> int:
    if not OPS:
        print("FAIL missing_ops_token")
        return 2

    # Stance / alignment
    try:
        with urllib.request.urlopen(f"{FE}/api/public-health", timeout=45, context=_CTX) as resp:
            ph = json.loads(resp.read().decode())
            code = resp.status
    except Exception as exc:
        ph, code = {}, 0
        check("stance", "public_health", False, str(exc)[:80])
    else:
        check("stance", "public_health", code == 200, str(code))
        check("stance", "launch_nogo", ph.get("rc1_launch") == "NO-GO", str(ph.get("rc1_launch")))
        check(
            "stance",
            "enrollment_off",
            ph.get("rc1_external_pilot_enrollment_enabled") is False,
            "",
        )
        check(
            "stance",
            "preview_on",
            ph.get("rc1_public_preview_enabled") is True
            or ph.get("rc1_public_preview") == "ON_READ_ONLY_SYNTHETIC",
            str(ph.get("rc1_public_preview_enabled")),
        )
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check(
            "stance",
            "fe_api_worker_aligned",
            bool(fe) and fe == api == wrk,
            f"fe={fe} api={api} wrk={wrk}",
        )

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("product", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        _summary()
        return 1

    # Unauth blocked
    code, _ = _req("GET", "/api/v1/candidates/me/import/catalog")
    check("product", "unauth_catalog_blocked", code in {401, 403}, str(code))

    code, cat = _req("GET", "/api/v1/candidates/me/import/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check(
        "product",
        "first_value_gate",
        isinstance(cat, dict) and "pilot_first_value_v1" in str(cat.get("first_value")),
        "",
    )
    check(
        "product",
        "zero_mutations_contract",
        isinstance(cat, dict) and cat.get("canonical_mutations_before_approval") == 0,
        "",
    )

    # A Document → Evidence
    code, batch = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "document"})
    check("product", "doc_create", code == 200 and isinstance(batch, dict), str(code))
    bk = (batch.get("batch_key") if isinstance(batch, dict) else "") or ""
    check("product", "doc_mutations_0_create", isinstance(batch, dict) and batch.get("canonical_mutations") == 0, "")
    content = b"Synthetic project note\n\nBuilt a staging preview.\n"
    code, up = _multipart_upload(token, bk, content, "synth.txt")
    check("product", "doc_upload", code == 200 and isinstance(up, dict) and up.get("state") == "QUARANTINED", str(code))
    check("product", "doc_mutations_0_upload", isinstance(up, dict) and up.get("canonical_mutations") == 0, "")
    code, prev = _req("POST", f"/api/v1/candidates/me/import/batches/{bk}/process", token=token)
    check(
        "product",
        "doc_preview",
        code == 200 and isinstance(prev, dict) and prev.get("state") == "PREVIEW_READY",
        str(code),
    )
    check("product", "doc_mutations_0_preview", isinstance(prev, dict) and prev.get("canonical_mutations") == 0, "")
    items = ((prev or {}).get("preview") or {}).get("items") or []
    keys = [it["item_key"] for it in items if isinstance(it, dict)]
    code, appr = _req(
        "POST",
        f"/api/v1/candidates/me/import/batches/{bk}/approve",
        token=token,
        body={
            "item_keys": keys,
            "preview_version": (prev or {}).get("preview_version"),
            "idempotency_key": f"appr-{bk[:12]}",
        },
    )
    check("product", "doc_approve", code == 200 and isinstance(appr, dict), str(code))
    check("product", "doc_mutations_0_approve", isinstance(appr, dict) and appr.get("canonical_mutations") == 0, "")
    code, cmt = _req(
        "POST",
        f"/api/v1/candidates/me/import/batches/{bk}/commit",
        token=token,
        body={"idempotency_key": f"cmt-{bk[:12]}"},
    )
    check(
        "product",
        "doc_commit",
        code == 200 and isinstance(cmt, dict) and cmt.get("state") == "COMMITTED",
        str(code),
    )
    check(
        "product",
        "doc_mutations_after_commit",
        isinstance(cmt, dict) and int(cmt.get("canonical_mutations") or 0) >= 1,
        str((cmt or {}).get("canonical_mutations")),
    )
    code, rb = _req("POST", f"/api/v1/candidates/me/import/batches/{bk}/rollback", token=token)
    check("product", "doc_rollback", code == 200 and isinstance(rb, dict) and rb.get("state") == "ROLLED_BACK", str(code))

    # B Tracker
    code, tb = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "tracker"})
    tbk = (tb.get("batch_key") if isinstance(tb, dict) else "") or ""
    code, _ = _multipart_upload(token, tbk, b"title,company,status\nDemo Role,Example Co,review\n", "tracker.csv")
    code, tprev = _req("POST", f"/api/v1/candidates/me/import/batches/{tbk}/process", token=token)
    check(
        "product",
        "tracker_preview",
        code == 200 and isinstance(tprev, dict) and tprev.get("state") == "PREVIEW_READY",
        str(code),
    )
    check("product", "tracker_mutations_0", isinstance(tprev, dict) and tprev.get("canonical_mutations") == 0, "")

    # C TWIN restore deny secrets
    code, xb = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "twin_export"})
    xbk = (xb.get("batch_key") if isinstance(xb, dict) else "") or ""
    code, _ = _multipart_upload(token, xbk, b'{"access_token":"x","evidence":[]}', "export.json")
    code, xprev = _req("POST", f"/api/v1/candidates/me/import/batches/{xbk}/process", token=token)
    check(
        "product",
        "twin_deny_secrets",
        code == 200 and isinstance(xprev, dict) and xprev.get("state") in {"FAILED", "REJECTED"},
        str((xprev or {}).get("state")),
    )
    check("product", "twin_deny_mutations_0", isinstance(xprev, dict) and xprev.get("canonical_mutations") == 0, "")

    # D reject / cancel
    code, zb = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "document"})
    zbk = (zb.get("batch_key") if isinstance(zb, dict) else "") or ""
    code, bad = _multipart_upload(token, zbk, b"PK\x03\x04fake", "note.txt")
    check(
        "product",
        "reject_zip_as_txt",
        code == 200 and isinstance(bad, dict) and bad.get("state") == "REJECTED",
        str((bad or {}).get("state")),
    )
    code, cb = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "document"})
    cbk = (cb.get("batch_key") if isinstance(cb, dict) else "") or ""
    code, deleted = _req("DELETE", f"/api/v1/candidates/me/import/batches/{cbk}", token=token)
    check(
        "product",
        "cancel_delete",
        code == 200 and isinstance(deleted, dict) and deleted.get("state") in {"CANCELLED", "DELETED"},
        str((deleted or {}).get("state")),
    )

    # E conflict / dup
    code, dbatch = _req("POST", "/api/v1/candidates/me/import/batches", token=token, body={"family": "tracker"})
    dbk = (dbatch.get("batch_key") if isinstance(dbatch, dict) else "") or ""
    dup_csv = b"title,company,status\nSame Role,Co A,review\nSame Role,Co B,review\n"
    code, _ = _multipart_upload(token, dbk, dup_csv, "tracker.csv")
    code, dprev = _req("POST", f"/api/v1/candidates/me/import/batches/{dbk}/process", token=token)
    ditems = ((dprev or {}).get("preview") or {}).get("items") or []
    check("product", "conflict_dup_marked", any(isinstance(it, dict) and it.get("dup") for it in ditems), "")

    # F first-value: upload ≠ first value (GFV still not completed by import alone)
    code, gfv = _req("GET", "/api/v1/candidates/me/guided-first-value", token=token)
    check(
        "product",
        "upload_not_first_value",
        code == 200
        and isinstance(gfv, dict)
        and not bool(gfv.get("real_first_value_reached")),
        str((gfv or {}).get("real_first_value_reached")),
    )

    # PP1 preview still on
    try:
        with urllib.request.urlopen(f"{FE}/preview", timeout=30, context=_CTX) as resp:
            check("stance", "pp1_preview_200", resp.status == 200, str(resp.status))
    except Exception as exc:
        check("stance", "pp1_preview_200", False, str(exc)[:80])

    return _summary()


def _summary() -> int:
    pp = sum(1 for _, ok, _ in product if ok)
    pf = sum(1 for _, ok, _ in product if not ok)
    sp = sum(1 for _, ok, _ in stance if ok)
    sf = sum(1 for _, ok, _ in stance if not ok)
    print(f"\nEpic 2.12 auth E2E product: {pp}/{pp + pf}  stance: {sp}/{sp + sf}")
    return 0 if pf == 0 and sf == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
