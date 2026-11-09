"""Pure-policy regression tests; no network, credentials, or external systems."""

from dataclasses import replace
from decimal import Decimal

from app.services.executive_agent.governance import (
    Action, Decision, Domain, Reversibility, Risk, Verification,
    WorkKind, assess_action, classify_work,
)


def safe_action() -> Action:
    return Action(
        operation="summarize_local_report",
        owner_domain=Domain.FUTURE_PROCESSING,
        tool_domain=Domain.FUTURE_PROCESSING,
        risk=Risk.LOW,
        reversibility=Reversibility.EASY,
        verification=Verification.EASY,
        estimated_incremental_cost_pln=Decimal("0.00"),
    )


def test_workflow_vs_agent_routing():
    assert classify_work(fixed_steps=True, needs_judgment=False) == WorkKind.AUTOMATION
    assert classify_work(fixed_steps=False, needs_judgment=True) == WorkKind.AGENT
    assert classify_work(fixed_steps=True, needs_judgment=True) == WorkKind.AGENT


def test_safe_read_can_run_automatically():
    assert assess_action(safe_action()).decision == Decision.AUTO


def test_cross_domain_tool_is_blocked():
    assert assess_action(replace(safe_action(), tool_domain=Domain.REALADVISOR)).decision == Decision.BLOCKED


def test_cross_domain_data_transfer_is_blocked():
    assert assess_action(replace(safe_action(), data_destination_domain=Domain.PERSONAL)).decision == Decision.BLOCKED


def test_external_writes_require_approval():
    a = replace(safe_action(), operation="send_customer_email", is_external_write=True)
    result = assess_action(a)
    assert result.decision == Decision.APPROVAL
    assert "external_write_requires_approval" in result.reasons


def test_each_red_flag_disables_autonomy():
    cases = (
        {"risk": Risk.HIGH},
        {"risk": Risk.CRITICAL},
        {"reversibility": Reversibility.DIFFICULT},
        {"reversibility": Reversibility.IMPOSSIBLE},
        {"verification": Verification.COSTLY},
        {"verification": Verification.UNKNOWN},
    )
    for change in cases:
        assert assess_action(replace(safe_action(), **change)).decision == Decision.APPROVAL


def test_nonzero_cost_requires_approval():
    a = replace(safe_action(), estimated_incremental_cost_pln=Decimal("0.01"))
    assert assess_action(a).decision == Decision.APPROVAL


def test_unknown_cost_requires_approval():
    a = replace(safe_action(), estimated_incremental_cost_pln=None)
    assert assess_action(a).decision == Decision.APPROVAL


def test_negative_cost_is_blocked():
    a = replace(safe_action(), estimated_incremental_cost_pln=Decimal("-1"))
    assert assess_action(a).decision == Decision.BLOCKED


def test_human_impact_requires_approval():
    assert assess_action(replace(safe_action(), human_impact=True)).decision == Decision.APPROVAL


def test_missing_operation_is_blocked():
    assert assess_action(replace(safe_action(), operation="  ")).decision == Decision.BLOCKED
