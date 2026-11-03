"""Fail closed before operations that can consume agent or CI/deployment usage."""

from __future__ import annotations

from typing import Any

from app.config import Settings

COST_APPROVAL_REQUIRED = "founder_cost_approval_required"


class CostApprovalRequired(RuntimeError):
    """A server-side interlock must be opened by an authorized operator."""

    def __init__(self) -> None:
        super().__init__(COST_APPROVAL_REQUIRED)


def require_billable_execution(settings: Settings) -> None:
    # Neither a read_only prompt nor an API key is approval to spend money.
    if settings.agent_dispatch_billable_execution_enabled is not True:
        raise CostApprovalRequired()


def cursor_integration_readiness(settings: Settings) -> dict[str, Any]:
    """Inspect local configuration only; never launch or query a remote agent."""
    enabled = settings.agent_dispatch_billable_execution_enabled is True
    return {
        "mode": "execution_enabled" if enabled else "metadata_only",
        "billable_execution_enabled": enabled,
        "founder_cost_approval_required": not enabled,
        "reason_code": None if enabled else COST_APPROVAL_REQUIRED,
        "cursor_credential_configured": bool(
            (settings.cursor_cloud_agents_api_key or "").strip()
        ),
        "credential_validation": "not_checked",
        "remote_connection_verified": False,
        "checks_remote_services": False,
        "launches_agent": False,
        "provider_budget_enforced": False,
    }
