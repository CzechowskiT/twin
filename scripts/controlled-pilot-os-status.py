#!/usr/bin/env python3
"""CLI: Controlled Pilot OS status (ops Bearer). Never prints secrets/full emails."""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

API = os.environ.get(
    "TWIN_PROD_API_BASE_URL", "https://twin-production-bcd9.up.railway.app"
).rstrip("/")
TOKEN = (
    os.environ.get("OPS_ADMIN_TOKEN")
    or os.environ.get("BETA_ADMIN_TOKEN")
    or os.environ.get("TWIN_OPS_ADMIN_TOKEN")
    or ""
).strip()


def _ssl_context() -> ssl.SSLContext:
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def main() -> int:
    if not TOKEN:
        # Public health fallback (no org details)
        url = f"{API}/api/v1/health?ops=1"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=45, context=_ssl_context()) as resp:
                body = json.loads(resp.read().decode())
        except Exception as exc:
            print(f"FAIL health {exc}", file=sys.stderr)
            return 2
        print(
            json.dumps(
                {
                    "mode": "public_health",
                    "git_commit": body.get("git_commit"),
                    "rc1_pilot_stance": body.get("rc1_pilot_stance"),
                    "rc1_launch": body.get("rc1_launch"),
                    "rc1_kpi_token": body.get("rc1_kpi_token"),
                    "rc1_os_verdict": body.get("rc1_os_verdict"),
                    "rc1_founder_approved_real_orgs": body.get(
                        "rc1_founder_approved_real_orgs"
                    ),
                    "hint": "Set OPS_ADMIN_TOKEN for full pilot-os/status",
                },
                indent=2,
            )
        )
        return 0

    url = f"{API}/api/v1/admin/pilot-os/status"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45, context=_ssl_context()) as resp:
            body = json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        print(f"FAIL http {exc.code}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"FAIL {exc}", file=sys.stderr)
        return 2

    # Strip any accidental full emails
    safe = {
        "verdict": body.get("verdict"),
        "stance": body.get("stance"),
        "kpi_token": body.get("kpi_token"),
        "canonical_url": body.get("canonical_url"),
        "founder_approved_real_orgs": body.get("founder_approved_real_orgs"),
        "invitation_packs": [
            {
                "id": p.get("id"),
                "organization_id": p.get("organization_id"),
                "status": p.get("status"),
                "recipient_count": p.get("recipient_count"),
            }
            for p in (body.get("invitation_packs") or [])
        ],
        "support_open_tickets": body.get("support_open_tickets"),
        "launch_go_gate": {
            "launch_decision": (body.get("launch_go_gate") or {}).get("launch_decision"),
            "reason": (body.get("launch_go_gate") or {}).get("reason"),
            "kpi_token": (body.get("launch_go_gate") or {}).get("kpi_token"),
            "counts": (body.get("launch_go_gate") or {}).get("counts"),
        },
        "next_founder_action": body.get("next_founder_action"),
        "organizations": [
            {
                "id": o.get("id"),
                "slug": o.get("slug"),
                "approval_status": o.get("approval_status"),
                "is_synthetic": o.get("is_synthetic"),
                "recipient_count": o.get("recipient_count"),
            }
            for o in (body.get("organizations") or [])
        ],
    }
    print(json.dumps(safe, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
