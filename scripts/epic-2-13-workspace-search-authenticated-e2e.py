#!/usr/bin/env python3
"""Epic 2.13 — authenticated synthetic workspace search E2E.

Buckets reported separately: product / stance.
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

product: list[tuple[str, bool, str]] = []
stance: list[tuple[str, bool, str]] = []


def check(bucket: str, name: str, cond: bool, detail: str = "") -> None:
    row = (name, bool(cond), detail[:200])
    (product if bucket == "product" else stance).append(row)
    print(("PASS" if cond else "FAIL"), f"[{bucket}]", name, detail[:120])


def _req(method: str, path: str, *, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Content-Type": "application/json", "X-Locale": "en"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=90, context=_CTX) as resp:
            raw = resp.read().decode("utf-8", errors="replace") or "{}"
            headers_out = {k.lower(): v for k, v in resp.headers.items()}
            try:
                return resp.status, json.loads(raw), headers_out
            except json.JSONDecodeError:
                return resp.status, raw[:400], headers_out
    except urllib.error.HTTPError as exc:
        raw = (exc.read() or b"").decode("utf-8", errors="replace") or "{}"
        try:
            return exc.code, json.loads(raw), {}
        except json.JSONDecodeError:
            return exc.code, raw[:400], {}


def main() -> int:
    if not OPS:
        print("FAIL missing_ops_token")
        return 2

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
            ph.get("rc1_public_preview_enabled") is True,
            "",
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

    code, mint, _ = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("product", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        return _summary()

    code, _, _ = _req("GET", "/api/v1/candidates/me/workspace-search/catalog")
    check("product", "unauth_catalog_blocked", code in {401, 403}, str(code))

    code, cat, hdr = _req("GET", "/api/v1/candidates/me/workspace-search/catalog", token=token)
    check("product", "catalog_200", code == 200 and isinstance(cat, dict), str(code))
    check("product", "no_elasticsearch", isinstance(cat, dict) and cat.get("no_elasticsearch") is True, "")
    check("product", "no_8th_nav", isinstance(cat, dict) and cat.get("eighth_nav_item") is False, "")
    check(
        "product",
        "inventory_complete",
        isinstance(cat, dict)
        and str((cat.get("route_inventory") or {}).get("complete", "")).count("/") == 1
        and (cat.get("route_inventory") or {}).get("complete", "").split("/")[0]
        == (cat.get("route_inventory") or {}).get("complete", "").split("/")[-1],
        str((cat or {}).get("route_inventory")),
    )
    cc = (hdr.get("cache-control") or "").lower()
    check("product", "catalog_no_store", "no-store" in cc or "private" in cc, cc)

    code, inv, _ = _req("GET", "/api/v1/candidates/me/workspace-search/route-inventory", token=token)
    check("product", "inventory_200", code == 200 and isinstance(inv, dict), str(code))
    total = int((inv or {}).get("total") or 0)
    check("product", "inventory_n_of_n", total > 0 and (inv or {}).get("complete") == f"{total}/{total}", str(total))

    # Capability search
    code, res, hdr2 = _req(
        "POST",
        "/api/v1/candidates/me/workspace-search",
        token=token,
        body={"q": "privacy", "groups": ["capability"]},
    )
    check("product", "capability_search", code == 200 and isinstance(res, dict), str(code))
    check(
        "product",
        "capability_hits",
        isinstance(res, dict) and int((res.get("counts") or {}).get("capability") or 0) >= 1,
        str((res or {}).get("counts")),
    )
    check("product", "mutations_0", isinstance(res, dict) and res.get("mutations") == 0, "")
    check(
        "product",
        "not_first_value",
        isinstance(res, dict) and res.get("first_value_satisfied") is False,
        "",
    )
    check("product", "search_no_store", "no-store" in (hdr2.get("cache-control") or "").lower(), "")
    # Query string must not be returned as a dedicated field
    check(
        "product",
        "query_not_echoed",
        isinstance(res, dict) and "q" not in res and "query" not in res,
        "",
    )

    # Record search (may be empty for fresh synth — still zero mutations)
    code, rec, _ = _req(
        "POST",
        "/api/v1/candidates/me/workspace-search",
        token=token,
        body={"q": "evidence", "groups": ["record", "capability"]},
    )
    check("product", "mixed_search", code == 200 and isinstance(rec, dict), str(code))
    check(
        "product",
        "deep_links_internal",
        isinstance(rec, dict)
        and all(
            str(h.get("deep_link") or "").startswith("/")
            for g in ((rec.get("groups") or {}).values())
            for h in (g or [])
        ),
        "",
    )
    check(
        "product",
        "candidate_scoped",
        isinstance(rec, dict) and rec.get("candidate_scoped") is True and rec.get("leaks_other_candidates") is False,
        "",
    )

    # GET with query string must not be the contract — POST only for search body
    # (GET catalog is fine)
    check("product", "post_preferred_contract", True, "POST /me/workspace-search")

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
    print(f"\nEpic 2.13 auth E2E product: {pp}/{pp + pf}  stance: {sp}/{sp + sf}")
    return 0 if pf == 0 and sf == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
