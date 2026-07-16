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

AGENT_DISPATCH_SCOPE_CREATE = "create"
AGENT_DISPATCH_SCOPE_READ = "read"
AGENT_DISPATCH_SCOPE_CANCEL = "cancel"
AGENT_DISPATCH_SCOPE_ADMIN = "admin"

ALL_DISPATCH_SCOPES = frozenset(
    {
        AGENT_DISPATCH_SCOPE_CREATE,
        AGENT_DISPATCH_SCOPE_READ,
        AGENT_DISPATCH_SCOPE_CANCEL,
        AGENT_DISPATCH_SCOPE_ADMIN,
    }
)


class DispatchRunStatus(str, Enum):
    """TWIN Dispatcher persistent run states."""

    QUEUED = "queued"
    DISPATCHING = "dispatching"
    RUNNING = "running"
    AWAITING_RESULT = "awaiting_result"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"
    NEEDS_ATTENTION = "needs_attention"


ACTIVE_LOCK_STATUSES = frozenset(
    {
        DispatchRunStatus.QUEUED.value,
        DispatchRunStatus.DISPATCHING.value,
        DispatchRunStatus.RUNNING.value,
        DispatchRunStatus.AWAITING_RESULT.value,
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
