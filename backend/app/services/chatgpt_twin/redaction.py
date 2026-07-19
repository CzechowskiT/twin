"""Redact Founder Command payloads for Custom GPT Actions (no secrets / prompts / raw logs)."""

from __future__ import annotations

from typing import Any

_SECRET_KEYS = frozenset(
    {
        "product_agent_prompt",
        "prompt",
        "encrypted_prompt",
        "token",
        "api_key",
        "secret",
        "authorization",
        "password",
        "private_key",
        "webhook_secret",
        "csrf_token",
        "raw_log",
        "logs",
        "stdout",
        "stderr",
    }
)


def _scrub(value: Any, *, depth: int = 0) -> Any:
    if depth > 8:
        return None
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            lk = str(k).lower()
            if lk in _SECRET_KEYS or any(s in lk for s in ("secret", "token", "password", "private_key")):
                continue
            if lk == "product_agent_prompt":
                continue
            out[str(k)] = _scrub(v, depth=depth + 1)
        return out
    if isinstance(value, list):
        return [_scrub(v, depth=depth + 1) for v in value[:40]]
    if isinstance(value, str) and len(value) > 2000:
        return value[:2000] + "…"
    return value


def redact_project_state(state: dict[str, Any]) -> dict[str, Any]:
    """Concise ProjectState for GPT — keep counters, gates, links; drop noise."""
    scrubbed = _scrub(state) or {}
    return {
        "resolved_at": scrubbed.get("resolved_at"),
        "repo": scrubbed.get("repo"),
        "production": scrubbed.get("production"),
        "health": scrubbed.get("health"),
        "counters": scrubbed.get("counters"),
        "gate_f": scrubbed.get("gate_f"),
        "launch": scrubbed.get("launch"),
        "roadmap": {
            "p0": (scrubbed.get("roadmap") or {}).get("p0", [])[:5],
            "p1": (scrubbed.get("roadmap") or {}).get("p1", [])[:3],
        },
        "runs": {
            "active": ((scrubbed.get("runs") or {}).get("active") or [])[:5],
            "recent": ((scrubbed.get("runs") or {}).get("recent") or [])[:5],
        },
        "prs_ci": (scrubbed.get("prs_ci") or [])[:5],
        "prior_decisions_pending": (scrubbed.get("prior_decisions_pending") or [])[:10],
        "reports_handoffs": [
            {
                "run_id": h.get("run_id"),
                "status": h.get("status"),
                "cursor_url": h.get("cursor_url"),
                "pr_url": h.get("pr_url"),
                "task_name": h.get("task_name"),
                "summary_preview": (h.get("summary_preview") or "")[:280],
            }
            for h in (scrubbed.get("reports_handoffs") or [])[:5]
            if isinstance(h, dict)
        ],
    }


def _clip(value: Any, limit: int) -> str | None:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        import json

        text = json.dumps(value, ensure_ascii=False, default=str)
    else:
        text = str(value)
    if len(text) > limit:
        return text[:limit] + "…"
    return text


def redact_command(public: dict[str, Any], *, include_timeline: bool = False) -> dict[str, Any]:
    """Stable, concise command view for GPT Actions."""
    plan = public.get("plan") or {}
    plan_safe = {
        "goal": plan.get("goal"),
        "batch_objective": plan.get("batch_objective"),
        "execution_mode": plan.get("execution_mode"),
        "execution_contract": _scrub(plan.get("execution_contract") or {}),
        "limits": plan.get("limits"),
        "approval_needs": plan.get("approval_needs") or [],
        "product_agent_prompt_present": bool(plan.get("product_agent_prompt_present")),
        "product_agent_prompt_hash": plan.get("product_agent_prompt_hash") or public.get("plan_hash"),
    }
    pending = public.get("pending_decisions") or []
    live = public.get("live_summary")
    final = public.get("final_summary")
    out: dict[str, Any] = {
        "command_id": public.get("id"),
        "status": public.get("status"),
        "current_stage": public.get("current_stage"),
        "direction": _clip(public.get("direction"), 1500) or "",
        "autonomy_level": public.get("autonomy_level"),
        "batch_index": public.get("batch_index"),
        "limits": public.get("limits"),
        "dispatch_run_id": public.get("dispatch_run_id"),
        "plan": plan_safe,
        "live_summary": _scrub(live) if isinstance(live, (dict, list)) else _clip(live, 800),
        "final_summary": _scrub(final) if isinstance(final, (dict, list)) else _clip(final, 2000),
        "links": _scrub(public.get("links") or {}),
        "pending_decisions": [
            {
                "decision_id": d.get("decision_id"),
                "operation": d.get("operation"),
                "risk": d.get("risk"),
                "title": d.get("title"),
                "expires_at": d.get("expires_at"),
            }
            for d in pending[:20]
            if isinstance(d, dict)
        ],
        "approval_required": bool(pending) or public.get("status") == "awaiting_approval",
        "error_code": public.get("error_code"),
        "error_message": _clip(public.get("error_message"), 400),
        "created_at": public.get("created_at"),
        "updated_at": public.get("updated_at"),
        "finished_at": public.get("finished_at"),
        "project_state": redact_project_state(public.get("project_state") or {}),
    }
    if include_timeline:
        timeline = public.get("timeline") or []
        out["timeline"] = [
            {
                "stage": t.get("stage"),
                "message": _clip(t.get("message"), 300),
                "created_at": t.get("created_at"),
            }
            for t in timeline[-30:]
            if isinstance(t, dict)
        ]
    return out


def redact_command_result(public: dict[str, Any]) -> dict[str, Any]:
    """Terminal / handoff-oriented result for polling GPT."""
    cmd = redact_command(public, include_timeline=True)
    state = cmd.get("project_state") or {}
    return {
        "command_id": cmd.get("command_id"),
        "status": cmd.get("status"),
        "current_stage": cmd.get("current_stage"),
        "live_summary": cmd.get("live_summary"),
        "final_summary": cmd.get("final_summary"),
        "links": cmd.get("links"),
        "dispatch_run_id": cmd.get("dispatch_run_id"),
        "pending_decisions": cmd.get("pending_decisions"),
        "approval_required": cmd.get("approval_required"),
        "counters": state.get("counters"),
        "gate_f": state.get("gate_f"),
        "launch": state.get("launch"),
        "reports_handoffs": state.get("reports_handoffs"),
        "timeline": cmd.get("timeline"),
        "error_code": cmd.get("error_code"),
        "error_message": cmd.get("error_message"),
        "finished_at": cmd.get("finished_at"),
    }


def command_links(command_id: str, base: str) -> dict[str, str]:
    root = base.rstrip("/")
    return {
        "self": f"{root}/api/v1/chatgpt/twin/commands/{command_id}",
        "result": f"{root}/api/v1/chatgpt/twin/commands/{command_id}/result",
        "latest": f"{root}/api/v1/chatgpt/twin/commands/latest",
        "pending_decisions": f"{root}/api/v1/chatgpt/twin/decisions/pending",
        "state": f"{root}/api/v1/chatgpt/twin/state",
        "fcc_dashboard": f"/admin/founder-command?id={command_id}",
    }
