"""External messaging/automation connectors — credential-gated.

Slack / Teams / Zapier: configuration endpoints exist; live delivery requires
founder-provisioned webhook/app credentials. Missing creds →
BLOCKED_EXTERNAL_CREDENTIALS (not Founder HELD_POLICY).
"""

from __future__ import annotations

import os
from typing import Any


def _env(*names: str) -> str:
    for n in names:
        v = (os.environ.get(n) or "").strip()
        if v:
            return v
    return ""


def slack_connector_status() -> dict[str, Any]:
    url = _env("SLACK_INCOMING_WEBHOOK_URL", "TWIN_SLACK_WEBHOOK_URL")
    if not url.startswith("https://"):
        return {
            "connector": "slack",
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "SLACK_INCOMING_WEBHOOK_URL unset",
            "delivery": False,
        }
    return {
        "connector": "slack",
        "status": "READY",
        "blocker": None,
        "reason": "Incoming webhook configured — internal draft posts allowed",
        "delivery": True,
    }


def teams_connector_status() -> dict[str, Any]:
    url = _env("TEAMS_INCOMING_WEBHOOK_URL", "TWIN_TEAMS_WEBHOOK_URL")
    if not url.startswith("https://"):
        return {
            "connector": "teams",
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "TEAMS_INCOMING_WEBHOOK_URL unset",
            "delivery": False,
        }
    return {
        "connector": "teams",
        "status": "READY",
        "blocker": None,
        "reason": "Incoming webhook configured",
        "delivery": True,
    }


def zapier_connector_status() -> dict[str, Any]:
    url = _env("ZAPIER_HOOK_URL", "TWIN_ZAPIER_HOOK_URL")
    token = _env("ZAPIER_HOOK_TOKEN", "TWIN_ZAPIER_HOOK_TOKEN")
    if not url.startswith("https://"):
        return {
            "connector": "zapier",
            "status": "BLOCKED_EXTERNAL_CREDENTIALS",
            "blocker": "BLOCKED_EXTERNAL_CREDENTIALS",
            "reason": "ZAPIER_HOOK_URL unset",
            "delivery": False,
        }
    return {
        "connector": "zapier",
        "status": "READY",
        "blocker": None,
        "reason": "Hook URL configured" + (" (+token)" if token else ""),
        "delivery": True,
    }


def all_connector_statuses() -> dict[str, Any]:
    return {
        "slack": slack_connector_status(),
        "teams": teams_connector_status(),
        "zapier": zapier_connector_status(),
        "external_delivery_default": False,
    }
