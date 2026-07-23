"""Truthful claims gates — tech readiness ≠ marketing / legal certification.

Founder Class D: TECH_READY_NO_CLAIM for ai_act_certified_claim and
ai_protected_attr_monitoring. Never auto-PASS registry from this module.
"""

from __future__ import annotations

from typing import Any

# --- Tech readiness (engineering) vs marketing / legal claim gates ---

# AI Act: control coverage may be tech-ready; certification claim is never true
# until formal legal certification exists outside this codebase.
AI_ACT_TECH_CONTROL_COVERAGE_READY = True
AI_ACT_CERTIFIED_CLAIMABLE = False
AI_ACT_CERTIFIED_CLAIM = False  # honesty constant — always false

# Protected-attribute monitoring: tech scaffolding may exist; legal/marketing
# enablement stays behind a separate gate (no false certification).
PROTECTED_ATTR_MONITORING_TECH_READY = True
PROTECTED_ATTR_MONITORING_LEGAL_GATE_OPEN = False
PROTECTED_ATTR_MONITORING_MARKETING_CLAIMABLE = False

# Modules that must never be claimable as certified / legally cleared via code.
NON_CLAIMABLE_CERTIFICATION_MODULES: frozenset[str] = frozenset(
    {
        "ai_act_certified_claim",
        "ai_protected_attr_monitoring",
    }
)

# Split: tech PASS evidence ≠ marketing claim legal gate.
CLAIM_GATE_SPLIT: dict[str, dict[str, Any]] = {
    "ai_act_certified_claim": {
        "tech_ready": AI_ACT_TECH_CONTROL_COVERAGE_READY,
        "marketing_claim_legal_gate": AI_ACT_CERTIFIED_CLAIMABLE,
        "honesty_field": "ai_act_certified",
        "honesty_value": False,
        "stance": "TECH_READY_NO_CLAIM",
    },
    "ai_protected_attr_monitoring": {
        "tech_ready": PROTECTED_ATTR_MONITORING_TECH_READY,
        "marketing_claim_legal_gate": PROTECTED_ATTR_MONITORING_LEGAL_GATE_OPEN,
        "honesty_field": "ai_protected_attribute_monitoring_enabled",
        "honesty_value": False,
        "stance": "TECH_READY_NO_CLAIM",
    },
}


def assert_certification_not_claimable(module_id: str, *, status: str) -> None:
    """Block PASS (or certified marketing) for modules that require legal cert."""
    if module_id not in NON_CLAIMABLE_CERTIFICATION_MODULES:
        return
    if status.upper() in {"PASS", "CERTIFIED", "LIVE_CLAIM"}:
        raise ValueError(f"certification_claim_forbidden:{module_id}")


def truthful_claims_honesty() -> dict[str, Any]:
    """Honesty payload — tech_ready flags may be true; certification claims stay false."""
    return {
        "ai_act_certified": False,  # always — legal cert never inferred from code
        "ai_act_certified_claimable": AI_ACT_CERTIFIED_CLAIMABLE,
        "ai_act_tech_control_coverage_ready": AI_ACT_TECH_CONTROL_COVERAGE_READY,
        "ai_protected_attribute_monitoring_enabled": False,
        "protected_attr_monitoring_tech_ready": PROTECTED_ATTR_MONITORING_TECH_READY,
        "protected_attr_monitoring_legal_gate_open": False,  # always until legal gate opens
        "protected_attr_monitoring_marketing_claimable": PROTECTED_ATTR_MONITORING_MARKETING_CLAIMABLE,
        "stance": "TECH_READY_NO_CLAIM",
        "non_claimable_modules": sorted(NON_CLAIMABLE_CERTIFICATION_MODULES),
        "claim_gate_split": CLAIM_GATE_SPLIT,
        "compliance_language": "readiness_and_control_coverage_only",
        "registry_pass_forbidden": True,
    }
