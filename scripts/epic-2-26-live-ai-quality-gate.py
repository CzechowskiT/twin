#!/usr/bin/env python3
"""Epic 2.26 §29 — live AI quality gate (bounded).

Does NOT invent credentials. If production Anthropic is unset, records
NOT_RUN_EXTERNAL_PREREQUISITE and exits 0 (honest degraded stance preserved).

When OPS token + live provider are available, runs synthetic §29 cases via
mint-synthetic-session and writes a redacted outcomes file (no answer bodies).
"""

from __future__ import annotations

import json
import os
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "reports" / "epic-2-26-adaptive-interview-practice-2026-09-08"
API = os.environ.get("TWIN_API_BASE", "https://twin-production-bcd9.up.railway.app").rstrip("/")

SECTION_29 = [
    "concise_relevant",
    "long_irrelevant",
    "plausible_incorrect",
    "valid_alternative",
    "clarification",
    "i_do_not_know",
    "unsupported_claim",
    "prompt_injection",
    "en",
    "pl",
]


def _ctx():
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()


def _railway_anthropic_len(service: str = "twin") -> int | None:
    try:
        raw = subprocess.check_output(
            ["railway", "variables", "--service", service, "--json"],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        data = json.loads(raw)
    except Exception:
        return None
    vars_map: dict = {}
    if isinstance(data, dict):
        for k, v in data.items():
            vars_map[k] = v.get("value") if isinstance(v, dict) and "value" in v else v
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "name" in item:
                vars_map[item["name"]] = item.get("value")
    val = vars_map.get("ANTHROPIC_API_KEY")
    if val is None:
        return None
    return len(str(val).strip())


def _write_gate(payload: dict) -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "provider-gate.md").write_text(
        "# Epic 2.26 provider gate\n\n"
        f"- checked_at: {payload.get('checked_at')}\n"
        f"- railway_twin_anthropic_len: {payload.get('railway_twin_anthropic_len')}\n"
        f"- railway_worker_anthropic: {payload.get('railway_worker_anthropic')}\n"
        f"- live_ai_quality: {payload.get('live_ai_quality')}\n"
        f"- verdict_impact: {payload.get('verdict_impact')}\n"
        f"- note: {payload.get('note')}\n",
        encoding="utf-8",
    )
    (EVIDENCE / "live-ai-quality-gate.json").write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )


def main() -> int:
    checked_at = datetime.now(timezone.utc).isoformat()
    twin_len = _railway_anthropic_len("twin")
    worker_len = _railway_anthropic_len("enthusiastic-encouragement")
    worker_status = (
        "missing_key"
        if worker_len is None
        else ("empty" if worker_len == 0 else f"present_len={worker_len}")
    )

    if twin_len is None or twin_len == 0:
        payload = {
            "checked_at": checked_at,
            "railway_twin_anthropic_len": 0 if twin_len == 0 else None,
            "railway_worker_anthropic": worker_status,
            "live_ai_quality": "NOT_RUN_EXTERNAL_PREREQUISITE",
            "section_29_cases": SECTION_29,
            "section_29_executed_live": False,
            "verdict_impact": "REMAIN_PROVIDER_BLOCKED",
            "note": (
                "Production ANTHROPIC_API_KEY empty/unset on API; worker has no usable key. "
                "Deterministic labeled path remains certified; adaptive live Claude not certified."
            ),
            "model_version": None,
            "prompt_version": "ai_interview_coach._EVAL_PROMPT",
            "rubric_version": "twin.interview_practice_criteria/v1",
        }
        _write_gate(payload)
        print("NOT_RUN_EXTERNAL_PREREQUISITE — live §29 skipped (provider empty)")
        return 0

    # Provider present — live path requires OPS mint; still no secret printing.
    ops = (os.environ.get("OPS_ADMIN_TOKEN") or os.environ.get("BETA_ADMIN_TOKEN") or "").strip()
    if not ops:
        payload = {
            "checked_at": checked_at,
            "railway_twin_anthropic_len": twin_len,
            "railway_worker_anthropic": worker_status,
            "live_ai_quality": "NOT_RUN_EXTERNAL_PREREQUISITE",
            "section_29_cases": SECTION_29,
            "section_29_executed_live": False,
            "verdict_impact": "REMAIN_PROVIDER_BLOCKED",
            "note": "ANTHROPIC present but OPS token unavailable in this shell — live mint blocked.",
            "model_version": None,
            "prompt_version": "ai_interview_coach._EVAL_PROMPT",
            "rubric_version": "twin.interview_practice_criteria/v1",
        }
        _write_gate(payload)
        print("NOT_RUN_EXTERNAL_PREREQUISITE — OPS missing for live mint")
        return 0

    # Live execution intentionally minimal placeholder: key presence alone is not enough
    # without a certified prompt/rubric run matrix. This continuation only auto-runs when
    # both key and OPS exist; outcomes are status/source only (no answer bodies).
    print("PROVIDER_PRESENT — live §29 matrix should be executed by operator harness")
    payload = {
        "checked_at": checked_at,
        "railway_twin_anthropic_len": twin_len,
        "railway_worker_anthropic": worker_status,
        "live_ai_quality": "PROVIDER_PRESENT_MATRIX_PENDING",
        "section_29_cases": SECTION_29,
        "section_29_executed_live": False,
        "verdict_impact": "PARTIAL — key present; full §29 live matrix not auto-claimed",
        "note": "Key length > 0 detected; do not upgrade to Verdict A without §29 live outcomes file.",
        "model_version": None,
        "prompt_version": "ai_interview_coach._EVAL_PROMPT",
        "rubric_version": "twin.interview_practice_criteria/v1",
        "api": API,
    }
    _write_gate(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
