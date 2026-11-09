"""Fail-closed Executive Agent tool-call policy (zero external side effects).

All external tool invocations MUST be authorized server-side by the runtime;
this isolated module is not itself a live agent or a substitute for RBAC.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class Domain(str, Enum):
    PERSONAL = "personal"
    FUTURE_PROCESSING = "future_processing"
    REALADVISOR = "realadvisor"
    TWIN_DEVELOPMENT = "twin_development"


class WorkKind(str, Enum):
    AUTOMATION = "automation"
    AGENT = "agent"


class Risk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Reversibility(str, Enum):
    EASY = "easy"
    DIFFICULT = "difficult"
    IMPOSSIBLE = "impossible"


class Verification(str, Enum):
    EASY = "easy"
    COSTLY = "costly"
    UNKNOWN = "unknown"


class Decision(str, Enum):
    AUTO = "auto"
    APPROVAL = "approval"
    BLOCKED = "blocked"


@dataclass(frozen=True)
class Action:
    """Proposed single action; pass metadata, never raw secrets or private content.

    A missing estimated_incremental_cost_pln is *unknown*, not free.
    External writes include email/Slack sends, CRM/calendar mutations,
    document shares, production deploys and financial commitments.
    """
    operation: str
    owner_domain: Domain
    tool_domain: Domain
    risk: Risk
    reversibility: Reversibility
    verification: Verification
    estimated_incremental_cost_pln: Decimal | None = None
    is_external_write: bool = False
    accesses_confidential_data: bool = False
    data_destination_domain: Domain | None = None
    human_impact: bool = False


@dataclass(frozen=True)
class Assessment:
    decision: Decision
    reasons: tuple[str, ...]


def classify_work(*, fixed_steps: bool, needs_judgment: bool) -> WorkKind:
    """Repeatable sequence -> automation; judgment/ambiguity -> agent planner."""
    return WorkKind.AUTOMATION if fixed_steps and not needs_judgment else WorkKind.AGENT


def assess_action(action: Action) -> Assessment:
    """Any risk/reversibility/verification red flag disables autonomy.

    Cross-domain access is blocked, not discretionarily overridden. Any paid
    call or external write requires founder approval; no automatic spending.
    """
    if not action.operation or not action.operation.strip():
        return Assessment(Decision.BLOCKED, ("missing_operation",))
    if action.owner_domain != action.tool_domain:
        return Assessment(Decision.BLOCKED, ("cross_domain_tool_access",))
    if (
        action.data_destination_domain is not None
        and action.data_destination_domain != action.owner_domain
    ):
        return Assessment(Decision.BLOCKED, ("cross_domain_data_transfer",))
    if (
        action.estimated_incremental_cost_pln is not None
        and action.estimated_incremental_cost_pln < 0
    ):
        return Assessment(Decision.BLOCKED, ("invalid_negative_cost",))

    reasons: list[str] = []
    if action.risk in {Risk.HIGH, Risk.CRITICAL}:
        reasons.append("risk_red_flag")
    elif action.risk == Risk.MEDIUM:
        reasons.append("risk_review")
    if action.reversibility != Reversibility.EASY:
        reasons.append("reversibility_red_flag")
    if action.verification != Verification.EASY:
        reasons.append("verification_red_flag")
    if action.estimated_incremental_cost_pln is None:
        reasons.append("cost_unknown")
    elif action.estimated_incremental_cost_pln > 0:
        reasons.append("cost_requires_prior_approval")
    if action.is_external_write:
        reasons.append("external_write_requires_approval")
    if action.human_impact:
        reasons.append("human_impact_requires_approval")
    if action.accesses_confidential_data and action.owner_domain == Domain.PERSONAL:
        reasons.append("confidential_data_personal_scope_review")

    if reasons:
        return Assessment(Decision.APPROVAL, tuple(reasons))
    return Assessment(Decision.AUTO, ("safe_read_or_local_reversible_action",))
