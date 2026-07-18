"""Agent Dispatcher constants — Cursor contract + TWIN run state machine.

Cursor Cloud Agents API contract audited from official docs on 2026-07-16:
- https://cursor.com/docs/cloud-agent/api/endpoints (v1 public beta)
- https://cursor.com/docs/cloud-agent/api/v0 (legacy; webhooks)
- https://cursor.com/docs/cloud-agent/api/webhooks
- https://cursor.com/docs/api (auth + rate limits)
"""

from __future__ import annotations

from enum import Enum

CURSOR_CONTRACT_DOC_DATE = "2026-07-16"
CURSOR_CONTRACT_VERSION = "v1-public-beta+v0-webhooks"
CURSOR_API_BASE_URL = "https://api.cursor.com"

# Cursor v1 run statuses (from Get A Run / Stream docs).
CURSOR_V1_RUN_CREATING = "CREATING"
CURSOR_V1_RUN_RUNNING = "RUNNING"
CURSOR_V1_RUN_FINISHED = "FINISHED"
CURSOR_V1_RUN_ERROR = "ERROR"
CURSOR_V1_RUN_CANCELLED = "CANCELLED"
CURSOR_V1_RUN_EXPIRED = "EXPIRED"

CURSOR_V1_TERMINAL = frozenset(
    {
        CURSOR_V1_RUN_FINISHED,
        CURSOR_V1_RUN_ERROR,
        CURSOR_V1_RUN_CANCELLED,
        CURSOR_V1_RUN_EXPIRED,
    }
)

# Cursor v0 agent statuses used by webhooks (FINISHED / ERROR).
CURSOR_V0_FINISHED = "FINISHED"
CURSOR_V0_ERROR = "ERROR"
CURSOR_V0_CREATING = "CREATING"
CURSOR_V0_RUNNING = "RUNNING"

PROMPT_ENVELOPE_VERSION = "twin-agent-dispatch-prompt/v1"

# Canonical scopes (MCP / ChatGPT connector contract).
AGENT_DISPATCH_SCOPE_CREATE = "agent_runs:create"
AGENT_DISPATCH_SCOPE_READ = "agent_runs:read"
AGENT_DISPATCH_SCOPE_CANCEL = "agent_runs:cancel"
AGENT_DISPATCH_SCOPE_ADMIN = "agent_runs:admin"

# Short aliases accepted in AGENT_DISPATCH_TOKENS for ops convenience.
_SCOPE_ALIASES = {
    "create": AGENT_DISPATCH_SCOPE_CREATE,
    "read": AGENT_DISPATCH_SCOPE_READ,
    "cancel": AGENT_DISPATCH_SCOPE_CANCEL,
    "admin": AGENT_DISPATCH_SCOPE_ADMIN,
    AGENT_DISPATCH_SCOPE_CREATE: AGENT_DISPATCH_SCOPE_CREATE,
    AGENT_DISPATCH_SCOPE_READ: AGENT_DISPATCH_SCOPE_READ,
    AGENT_DISPATCH_SCOPE_CANCEL: AGENT_DISPATCH_SCOPE_CANCEL,
    AGENT_DISPATCH_SCOPE_ADMIN: AGENT_DISPATCH_SCOPE_ADMIN,
}

ALL_DISPATCH_SCOPES = frozenset(
    {
        AGENT_DISPATCH_SCOPE_CREATE,
        AGENT_DISPATCH_SCOPE_READ,
        AGENT_DISPATCH_SCOPE_CANCEL,
        AGENT_DISPATCH_SCOPE_ADMIN,
    }
)

DEFAULT_EXECUTION_POLICY = {
    "single_active_run": True,
    "manual_merge_only": True,
    "no_admin_override": True,
    "no_auto_merge": True,
    "final_report_once": True,
}


def normalize_scope(scope: str) -> str | None:
    """Map short or canonical scope names to canonical form."""
    return _SCOPE_ALIASES.get((scope or "").strip())


class DispatchRunStatus(str, Enum):
    """TWIN Dispatcher persistent run states."""

    QUEUED = "queued"
    DISPATCHING = "dispatching"
    RUNNING = "running"
    AWAITING_RESULT = "awaiting_result"
    WAITING_FOR_OPERATOR = "waiting_for_operator"
    MERGING = "merging"
    DEPLOYING = "deploying"
    REGRESSION = "regression"
    FINALIZING = "finalizing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"
    NEEDS_ATTENTION = "needs_attention"


OPERATOR_RUN_STATUSES = frozenset(
    {
        DispatchRunStatus.WAITING_FOR_OPERATOR.value,
        DispatchRunStatus.MERGING.value,
        DispatchRunStatus.DEPLOYING.value,
        DispatchRunStatus.REGRESSION.value,
        DispatchRunStatus.FINALIZING.value,
    }
)


ACTIVE_LOCK_STATUSES = frozenset(
    {
        DispatchRunStatus.QUEUED.value,
        DispatchRunStatus.DISPATCHING.value,
        DispatchRunStatus.RUNNING.value,
        DispatchRunStatus.AWAITING_RESULT.value,
        *OPERATOR_RUN_STATUSES,
        DispatchRunStatus.CANCELLING.value,
    }
)

DISPATCH_RUN_TERMINAL = frozenset(
    {
        DispatchRunStatus.SUCCEEDED.value,
        DispatchRunStatus.FAILED.value,
        DispatchRunStatus.TIMED_OUT.value,
        DispatchRunStatus.CANCELLED.value,
        DispatchRunStatus.NEEDS_ATTENTION.value,
    }
)

# Secret name documented for production — never log the value.
CURSOR_API_CREDENTIAL_SECRET_NAME = "CURSOR_CLOUD_AGENTS_API_KEY"
