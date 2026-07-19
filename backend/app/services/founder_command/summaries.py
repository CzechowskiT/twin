"""Live and final founder summaries (short; technical details optional)."""

from __future__ import annotations

import json
from typing import Any

from app.database.models import FounderCommand
from app.services.founder_command.constants import GATE_F_STATUS, LAUNCH_STANCE


def build_live_summary(command: FounderCommand, project_state: dict[str, Any] | None = None) -> dict[str, Any]:
    counters = (project_state or {}).get("counters") or {}
    links = {}
    try:
        links = json.loads(command.links_json or "{}")
    except json.JSONDecodeError:
        links = {}
    return {
        "command_id": command.id,
        "status": command.status,
        "stage": command.current_stage,
        "batch_index": command.batch_index,
        "headline": command.live_summary or f"Command {command.status} at stage {command.current_stage}",
        "autonomy_level": command.autonomy_level,
        "gate_f": GATE_F_STATUS,
        "launch": LAUNCH_STANCE,
        "counters": counters,
        "links": links,
        "cursor_agent_url": links.get("cursor_agent"),
        "dispatch_run_id": command.dispatch_run_id,
    }


def build_final_summary(
    command: FounderCommand,
    *,
    project_state: dict[str, Any] | None = None,
    technical: dict[str, Any] | None = None,
) -> dict[str, Any]:
    live = build_live_summary(command, project_state)
    counters = live.get("counters") or {}
    residual = sum(int(counters.get(k) or 0) for k in ("active_runs", "pending_decisions", "active_commands"))
    return {
        **live,
        "final": True,
        "outcome": command.status,
        "founder_facing": command.final_summary
        or "Batch complete. Open links below — no copy-paste required.",
        "counters_zero": residual == 0 and int(counters.get("open_prs") or 0) == 0,
        "technical_details": technical
        or {
            "plan_hash": command.plan_hash,
            "dispatch_run_id": command.dispatch_run_id,
            "batch_index": command.batch_index,
            "consecutive_failures": command.consecutive_failures,
        },
    }
