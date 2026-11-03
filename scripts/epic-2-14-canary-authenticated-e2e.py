#!/usr/bin/env python3
"""Epic 2.14 — authenticated synthetic canary E2E (product vs stance buckets).

Never creates a real invite. Activation stays PREPARED_NOT_EXECUTED.
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


def _summary() -> int:
    pp = sum(1 for _, ok, _ in product if ok)
    pf = sum(1 for _, ok, _ in product if not ok)
    sp = sum(1 for _, ok, _ in stance if ok)
    sf = sum(1 for _, ok, _ in stance if not ok)
    print(f"\nproduct {pp}/{pp + pf} · stance {sp}/{sp + sf}")
    return 0 if pf == 0 and sf == 0 else 1


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
        check("stance", "preview_on", ph.get("rc1_public_preview_enabled") is True, "")
        fe = (ph.get("frontend_commit") or "")[:12]
        api = (ph.get("api_commit") or "")[:12]
        wrk = (ph.get("worker_commit") or "")[:12]
        check(
            "stance",
            "fe_api_worker_aligned",
            bool(fe) and fe == api == wrk,
            f"fe={fe} api={api} wrk={wrk}",
        )
        # Canary readiness flags (may be absent pre-deploy — then fail product later)
        if "rc1_one_candidate_canary_active" in ph:
            check(
                "stance",
                "canary_not_active",
                ph.get("rc1_one_candidate_canary_active") is False,
                str(ph.get("rc1_one_candidate_canary_active")),
            )
        if "rc1_canary_activation_command" in ph:
            check(
                "stance",
                "activation_prepared_not_executed",
                ph.get("rc1_canary_activation_command") == "PREPARED_NOT_EXECUTED",
                str(ph.get("rc1_canary_activation_command")),
            )
        if "rc1_effective_canary_cap" in ph:
            check(
                "stance",
                "canary_cap_zero",
                int(ph.get("rc1_effective_canary_cap") or 0) == 0,
                str(ph.get("rc1_effective_canary_cap")),
            )

    code, mint = _req("POST", "/api/v1/admin/pilot-os/daily-os/mint-synthetic-session", token=OPS)
    check("product", "mint_synthetic", code == 200, str(code))
    token = (mint.get("access_token") if isinstance(mint, dict) else "") or ""
    check("product", "kpi_excluded", bool(isinstance(mint, dict) and mint.get("kpi_excluded")), "")
    if not token:
        return _summary()

    code, disc = _req("GET", "/api/v1/candidates/me/canary-journey/disclosure", token=token)
    check("product", "disclosure_200", code == 200 and isinstance(disc, dict), str(code))
    check(
        "product",
        "disclosure_ia_7",
        isinstance(disc, dict) and disc.get("primary_ia_count") == 7 and disc.get("eighth_nav_item") is False,
        str(disc)[:80] if isinstance(disc, dict) else "",
    )

    code, reg = _req("GET", "/api/v1/candidates/me/canary-journey/adoption-registry", token=token)
    check("product", "adoption_registry", code == 200 and isinstance(reg, dict), str(code))
    check(
        "product",
        "synthetic_never_flips_real",
        isinstance(reg, dict) and reg.get("synthetic_never_flips_real") is True,
        "",
    )

    code, fv = _req("GET", "/api/v1/candidates/me/first-value-ladder", token=token)
    check("product", "ladder_get", code == 200 and isinstance(fv, dict), str(code))
    check(
        "product",
        "contract_v1",
        isinstance(fv, dict) and fv.get("contract_id") == "pilot_first_value_v1",
        "",
    )
    check(
        "product",
        "not_route_alone",
        isinstance(fv, dict) and "route_visit_alone" in (fv.get("not_sufficient") or []),
        "",
    )

    # Shared synth candidate may carry prior ladder state — reset without claiming REAL
    code, reset = _req(
        "POST",
        "/api/v1/candidates/me/first-value-ladder",
        token=token,
        body={"target": "READY", "lane": "SYNTHETIC"},
    )
    check(
        "product",
        "ladder_reset_ready",
        code == 200
        and isinstance(reset, dict)
        and reset.get("ladder") == "READY"
        and reset.get("real_first_value_reached") is False,
        str(reset)[:120] if isinstance(reset, dict) else str(code),
    )

    code, fv2 = _req(
        "POST",
        "/api/v1/candidates/me/first-value-ladder",
        token=token,
        body={"target": "VIEWED", "lane": "SYNTHETIC"},
    )
    check("product", "ladder_viewed", code == 200 and isinstance(fv2, dict) and fv2.get("ladder") == "VIEWED", str(code))

    code, fv3 = _req(
        "POST",
        "/api/v1/candidates/me/first-value-ladder",
        token=token,
        body={"target": "ACTIONED", "lane": "SYNTHETIC"},
    )
    check(
        "product",
        "ladder_actioned_synth",
        code == 200 and isinstance(fv3, dict) and fv3.get("ladder") == "ACTIONED",
        str(code),
    )
    check(
        "product",
        "synth_not_real_fv",
        isinstance(fv3, dict) and fv3.get("real_first_value_reached") is False,
        str((fv3 or {}).get("real_first_value_reached") if isinstance(fv3, dict) else ""),
    )

    code, fr = _req(
        "POST",
        "/api/v1/candidates/me/canary-journey/friction",
        token=token,
        body={"event_code": "empty_state_seen", "surface": "home", "payload": {"q": "leak", "count": 1}},
    )
    check("product", "friction_ok", code == 200 and isinstance(fr, dict) and fr.get("ok") is True, str(code))
    check("product", "friction_no_query_log", isinstance(fr, dict) and fr.get("query_logged") is False, "")

    # Admin control plane
    code, ctl = _req("GET", "/api/v1/admin/canary/control", token=OPS)
    check("product", "admin_control_get", code == 200 and isinstance(ctl, dict), str(code))
    check(
        "product",
        "admin_not_active",
        isinstance(ctl, dict) and ctl.get("active_one_candidate") is False,
        "",
    )
    before_inv = int((ctl or {}).get("real_invites_created") or 0) if isinstance(ctl, dict) else -1

    code, prep = _req("POST", "/api/v1/admin/canary/control", token=OPS, body={"action": "prepare"})
    check("product", "admin_prepare", code == 200 and isinstance(prep, dict), str(code))

    code, dry = _req(
        "POST", "/api/v1/admin/canary/control", token=OPS, body={"action": "create_invite_dry_run"}
    )
    check("product", "admin_dry_run", code == 200 and isinstance(dry, dict), str(code))
    check(
        "product",
        "dry_run_no_invite_inc",
        isinstance(dry, dict) and int(dry.get("real_invites_created") or 0) == before_inv == 0,
        str((dry or {}).get("real_invites_created") if isinstance(dry, dict) else dry),
    )

    code, gate = _req("POST", "/api/v1/admin/canary/evaluate-gate", token=OPS)
    check("product", "evaluate_gate", code == 200 and isinstance(gate, dict), str(code))
    check(
        "product",
        "still_not_executed",
        isinstance(gate, dict) and gate.get("activation_command") == "PREPARED_NOT_EXECUTED",
        str((gate or {}).get("activation_command") if isinstance(gate, dict) else ""),
    )
    check(
        "product",
        "still_not_active",
        isinstance(gate, dict) and gate.get("active_one_candidate") is False,
        "",
    )

    code, rep = _req("GET", "/api/v1/admin/canary/completion-report", token=OPS)
    check("product", "completion_report", code == 200 and isinstance(rep, dict), str(code))
    check(
        "product",
        "real_usability_not_evaluated",
        isinstance(rep, dict) and rep.get("REAL_CANDIDATE_USABILITY") == "NOT_EVALUATED",
        "",
    )

    # Unauth blocked
    code, _ = _req("GET", "/api/v1/candidates/me/first-value-ladder")
    check("product", "unauth_ladder_blocked", code in {401, 403}, str(code))

    try:
        with urllib.request.urlopen(f"{FE}/preview", timeout=30, context=_CTX) as resp:
            check("stance", "pp1_preview_200", resp.status == 200, str(resp.status))
    except Exception as exc:
        check("stance", "pp1_preview_200", False, str(exc)[:80])

    return _summary()


if __name__ == "__main__":
    sys.exit(main())
