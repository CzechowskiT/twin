"""Founder Command Center constants — autonomy, statuses, hard limits."""

from __future__ import annotations

from enum import Enum

FOUNDER_COMMAND_SCHEMA_VERSION = "founder-command/v1"
DEFAULT_REPO_URL = "https://github.com/CzechowskiT/twin"
DEFAULT_BASE_BRANCH = "cursor/phase1-monorepo-scaffold"
DEFAULT_AUTONOMY_LEVEL = 3

# Hard bans for continuous loops (Level 4 requires explicit caps).
DEFAULT_MAX_BATCHES = 5
DEFAULT_MAX_RUNTIME_MINUTES = 180
DEFAULT_MAX_CONSECUTIVE_FAILURES = 2
DEFAULT_MAX_RETRIES_PER_STAGE = 3
DEFAULT_MAX_OPEN_PRS = 3
DEFAULT_MAX_ACTIVE_RUNS = 1

GATE_F_STATUS = "PASS"
LAUNCH_STANCE = "GO"
# Railway backend deploy SHA. Frontend-only scaffold commits must not advance it.
KNOWN_PROD_SHA_HINT = "1a5d577c9c21279bb68c19bc1cfa5d7bcac04dfe"


class AutonomyLevel(int, Enum):
    ANALYSIS = 1
    BUILD = 2
    DEPLOY = 3
    CONTINUOUS = 4


class CommandStatus(str, Enum):
    DRAFT = "draft"
    ANALYZING = "analyzing"
    AWAITING_APPROVAL = "awaiting_approval"
    QUEUED = "queued"
    RUNNING = "running"
    PAUSED = "paused"
    CONTINUING = "continuing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    NEEDS_FOUNDER = "needs_founder"


class CommandStage(str, Enum):
    RESOLVE_STATE = "resolve_state"
    PLAN = "plan"
    APPROVAL_POLICY = "approval_policy"
    DISPATCH = "dispatch"
    AWAIT_AGENT = "await_agent"
    OPERATOR = "operator"
    MERGE_DEPLOY_REGRESSION = "merge_deploy_regression"
    REPORT_HANDOFF = "report_handoff"
    CONTINUE_OR_APPROVE = "continue_or_approve"
    FINALIZE = "finalize"


class DecisionRisk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DecisionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    AUTO_APPROVED = "auto_approved"


COMMAND_TERMINAL = frozenset(
    {
        CommandStatus.SUCCEEDED.value,
        CommandStatus.FAILED.value,
        CommandStatus.CANCELLED.value,
    }
)

ACTIVE_COMMAND_STATUSES = frozenset(
    {
        CommandStatus.ANALYZING.value,
        CommandStatus.AWAITING_APPROVAL.value,
        CommandStatus.QUEUED.value,
        CommandStatus.RUNNING.value,
        CommandStatus.PAUSED.value,
        CommandStatus.CONTINUING.value,
        CommandStatus.NEEDS_FOUNDER.value,
    }
)

# Safe ops the policy may auto-approve at Level ≥2.
SAFE_AUTO_OPS = frozenset(
    {
        "diagnose",
        "read_only_inspect",
        "reconcile_dispatch",
        "summarize",
        "plan_batch",
        "continue_safe_batch",
    }
)

# Always require explicit founder approval (destructive / override — not standard CI deploy).
HIGH_RISK_OPS = frozenset(
    {
        "merge_to_base",
        "schema_migration",
        "secret_rotation",
        "force_unlock",
        "change_allowlist",
        "continuous_without_caps",
        "destructive_data",
    }
)

# Standard Railway/Vercel deploy after green CI — auto under Approval Policy.
STANDARD_AUTO_DEPLOY_OPS = frozenset(
    {
        "production_deploy",
        "standard_production_deploy",
    }
)

ROADMAP_P0 = (
    "Preserve Gate F PASS + Launch GO",
    "Founder Command Center eliminates prompt/report copy-paste",
    "Agent Dispatcher + Operator stay single source of execution",
)
ROADMAP_P1 = (
    "Calendar of acceptance surfaces",
    "Placement verification self-serve path",
    "Microsoft Graph calendar parity",
)
ROADMAP_P2 = (
    "Email/Slack/push notification channels",
    "Broader continuous autonomy with stronger caps",
)
