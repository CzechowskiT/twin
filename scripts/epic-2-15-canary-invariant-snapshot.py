#!/usr/bin/env python3
"""Content-free canary/pilot business-state snapshot for Epic 2.15 invariant."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

KEYS = [
    "rc1_launch",
    "rc1_external_pilot_enrollment_enabled",
    "rc1_public_preview_enabled",
    "rc1_one_candidate_canary_ready",
    "rc1_one_candidate_canary_state",
    "rc1_one_candidate_canary_active",
    "rc1_canary_activation_command",
    "rc1_effective_canary_cap",
    "rc1_effective_cohort_cap",
    "rc1_real_canary_designation_count",
    "rc1_real_canary_designation_status",
    "rc1_real_canary_candidate_designated_ready",
    "rc1_pilot_runtime_state",
    "rc1_invite_send_enabled",
]


def fetch(url: str) -> dict:
    raw = subprocess.check_output(["curl", "-sS", url], text=True, timeout=30)
    return json.loads(raw)


def snapshot(health: dict) -> dict:
    return {k: health.get(k) for k in KEYS}


def main() -> int:
    fe = os.environ.get("TWIN_FE_HEALTH", "https://twin-sooty.vercel.app/api/public-health")
    mode = sys.argv[1] if len(sys.argv) > 1 else "print"
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    health = fetch(fe)
    snap = snapshot(health)
    snap["_meta"] = {
        "frontend_commit": health.get("frontend_commit"),
        "api_commit": health.get("api_commit"),
        "worker_commit": health.get("worker_commit"),
    }
    text = json.dumps(snap, indent=2, sort_keys=True)
    if mode == "write" and out_path:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text + "\n", encoding="utf-8")
        print(f"wrote {out_path}")
        return 0
    if mode == "diff" and out_path:
        before = json.loads(out_path.read_text(encoding="utf-8"))
        before_biz = {k: before.get(k) for k in KEYS}
        after_biz = {k: snap.get(k) for k in KEYS}
        diffs = {k: (before_biz[k], after_biz[k]) for k in KEYS if before_biz[k] != after_biz[k]}
        print(json.dumps({"diff_count": len(diffs), "diffs": diffs}, indent=2))
        return 0 if not diffs else 1
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
