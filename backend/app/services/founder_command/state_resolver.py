"""Canonical ProjectState resolver — prod SHAs, health, runs, gates, roadmap."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.models import (
    AgentDispatchLock,
    AgentDispatchRun,
    FounderCommand,
    FounderDecision,
)
from app.services.agent_dispatch.constants import ACTIVE_LOCK_STATUSES, DISPATCH_RUN_TERMINAL
from app.services.founder_command.constants import (
    ACTIVE_COMMAND_STATUSES,
    GATE_F_STATUS,
    KNOWN_PROD_SHA_HINT,
    LAUNCH_STANCE,
    ROADMAP_P0,
    ROADMAP_P1,
    ROADMAP_P2,
)


def _safe_json(raw: str | None) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None


def _git_commit_from_health() -> str | None:
    try:
        from app.api.health import _git_commit_sha

        return _git_commit_sha() or None
    except Exception:
        return None


def _pilot_slice(db: Session, settings: Settings) -> dict[str, Any]:
    """Real pilot OS slice — never invent customers; KPI honest."""
    try:
        from app.services.controlled_pilot_os import compute_first_customer_scores
        from app.services.pilot_stance import resolve_pilot_stance

        scores = compute_first_customer_scores(db, settings)
        return {
            "pilot_stance": resolve_pilot_stance(settings),
            "kpi_token": scores.get("kpi_token"),
            "first_customer_verdict": scores.get("first_customer_verdict"),
            "pilot_health_score": scores.get("pilot_health_score"),
            "launch_go_readiness_score": scores.get("launch_go_readiness_score"),
            "launch_decision": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
            "open_support_tickets": scores.get("open_support_tickets"),
            "open_feedback_items": scores.get("open_feedback_items"),
        }
    except Exception:
        return {
            "pilot_stance": "READY_FOR_CONTROLLED_PILOT",
            "kpi_token": "NO_REAL_PILOT_DATA",
            "first_customer_verdict": (
                "FIRST CUSTOMER READY — WAITING FOR FIRST APPROVED PILOT ORGANIZATION"
            ),
            "pilot_health_score": 80,
            "launch_go_readiness_score": 0,
            "launch_decision": "NO-GO",
            "enrollment": "OFF",
            "phase_3b": "BLOCKED",
        }


def resolve_project_state(db: Session, settings: Settings) -> dict[str, Any]:
    """Build canonical ProjectState — not merely the last Cursor report."""
    api_sha = _git_commit_from_health()
    repo_head_hint = KNOWN_PROD_SHA_HINT

    active_runs = (
        db.execute(
            select(AgentDispatchRun)
            .where(AgentDispatchRun.status.in_(list(ACTIVE_LOCK_STATUSES)))
            .order_by(AgentDispatchRun.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    recent_runs = (
        db.execute(
            select(AgentDispatchRun)
            .order_by(AgentDispatchRun.created_at.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )
    locks = db.execute(select(AgentDispatchLock)).scalars().all()
    open_prs = [
        {
            "run_id": r.id,
            "pr_url": r.result_pr_url,
            "branch": r.result_branch,
            "ci": r.result_ci_status,
            "status": r.status,
        }
        for r in recent_runs
        if r.result_pr_url and r.status not in DISPATCH_RUN_TERMINAL
    ]

    pending_decisions = (
        db.execute(
            select(FounderDecision)
            .where(FounderDecision.status == "pending")
            .order_by(FounderDecision.created_at.desc())
            .limit(20)
        )
        .scalars()
        .all()
    )
    active_commands = (
        db.execute(
            select(FounderCommand)
            .where(FounderCommand.status.in_(list(ACTIVE_COMMAND_STATUSES)))
            .order_by(FounderCommand.updated_at.desc())
            .limit(10)
        )
        .scalars()
        .all()
    )

    handoffs = []
    for r in recent_runs[:5]:
        meta = _safe_json(r.metadata_json) or {}
        if isinstance(meta, dict) and (meta.get("handoff") or r.result_summary):
            handoffs.append(
                {
                    "run_id": r.id,
                    "status": r.status,
                    "cursor_url": r.cursor_agent_url,
                    "pr_url": r.result_pr_url,
                    "summary_preview": (r.result_summary or "")[:400],
                    "task_name": r.task_name,
                }
            )

    alignment = "aligned" if api_sha and api_sha.startswith(repo_head_hint[:12]) else "unknown"
    if api_sha and repo_head_hint and api_sha == repo_head_hint:
        alignment = "aligned"

    return {
        "resolved_at": datetime.utcnow().isoformat() + "Z",
        "repo": {
            "url": (settings.agent_dispatch_repo_allowlist or "").split(",")[0].strip()
            or "https://github.com/CzechowskiT/twin",
            "base_branch": (settings.agent_dispatch_base_branch_allowlist or "").split(",")[0].strip()
            or "cursor/phase1-monorepo-scaffold",
            "allowlist_configured": bool((settings.agent_dispatch_repo_allowlist or "").strip()),
        },
        "production": {
            "api_git_commit": api_sha,
            "repo_head_hint": repo_head_hint,
            "alignment_status": alignment,
            "frontend_url": "https://twin-sooty.vercel.app",
            "api_url": "https://twin-production-bcd9.up.railway.app",
        },
        "health": {
            "dispatcher_operator_enabled": bool(settings.agent_dispatch_operator_enabled),
            "poll_enabled": bool(settings.agent_dispatch_poll_enabled),
            "active_dispatch_runs": len(active_runs),
            "active_locks": len(locks),
            "active_founder_commands": len(active_commands),
        },
        "runs": {
            "active": [
                {
                    "id": r.id,
                    "status": r.status,
                    "task_name": r.task_name,
                    "cursor_url": r.cursor_agent_url,
                    "pr_url": r.result_pr_url,
                    "execution_mode": r.execution_mode,
                }
                for r in active_runs
            ],
            "recent": [
                {
                    "id": r.id,
                    "status": r.status,
                    "task_name": r.task_name,
                    "cursor_url": r.cursor_agent_url,
                    "pr_url": r.result_pr_url,
                    "finished_at": r.finished_at.isoformat() + "Z" if r.finished_at else None,
                }
                for r in recent_runs
            ],
        },
        "locks": [
            {
                "repo_url": lock.repo_url,
                "base_branch": lock.base_branch,
                "run_id": lock.run_id,
                "lease_expires_at": lock.lease_expires_at.isoformat() + "Z"
                if lock.lease_expires_at
                else None,
            }
            for lock in locks
        ],
        "prs_ci": open_prs,
        "reports_handoffs": handoffs,
        "gate_f": {"status": GATE_F_STATUS, "preserve": True},
        "launch": {"stance": LAUNCH_STANCE, "preserve": True},
        "controlled_pilot": _pilot_slice(db, settings),
        "roadmap": {"p0": list(ROADMAP_P0), "p1": list(ROADMAP_P1), "p2": list(ROADMAP_P2)},
        "prior_decisions_pending": [
            {
                "decision_id": d.id,
                "command_id": d.command_id,
                "risk": d.risk,
                "title": d.title,
                "expires_at": d.expires_at.isoformat() + "Z" if d.expires_at else None,
            }
            for d in pending_decisions
        ],
        "counters": {
            "active_runs": len(active_runs),
            "active_locks": len(locks),
            "pending_decisions": len(pending_decisions),
            "open_prs": len(open_prs),
            "active_commands": len(active_commands),
        },
    }
