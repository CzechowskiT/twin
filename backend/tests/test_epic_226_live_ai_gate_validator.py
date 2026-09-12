"""Epic 2.26 — live AI gate validator integrity + negative controls.

Demonstrates that deterministic NOT_ASSESSED / consent-denied results cannot certify.
Also proves the harness fails when protected behavior is violated.
"""

from __future__ import annotations

import pytest

from app.services.live_ai_quality_validator import (
    assert_isolation_identities,
    check_live_case,
    check_live_certification_contract,
)


DETERMINISTIC_CONSENT_DENIED = {
    "score": None,
    "score_available": False,
    "source": "DETERMINISTIC_LIBRARY_FALLBACK",
    "source_label": "deterministic_library_consent_denied",
    "degraded": True,
    "consent_denied": True,
    "evaluation_status": "COMPLETE",
    "criteria": [{"id": "relevance", "outcome": "NOT_ASSESSED", "note": "checklist"}],
}


def test_deterministic_not_assessed_must_fail_live_certification():
    """REGRESSION: previously _check_case accepted this as PASS for all 10 cases."""
    case = {"id": "concise_relevant", "expect_criteria_present": True}
    result = check_live_case(case, DETERMINISTIC_CONSENT_DENIED, provider_execution=None)
    assert result["passed"] is False
    assert result["contract_ok"] is False
    joined = " ".join(result["failures"])
    assert "non_live_source" in joined or "consent_denied" in joined
    assert "all_criteria_not_assessed" in joined or "provider_execution_not_proven" in joined


def test_all_not_assessed_not_certified_even_with_fake_live_label():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "ANTHROPIC_CLAUDE",
        "source_label": "claude",
        "degraded": False,
        "criteria": [
            {"id": "relevance", "outcome": "NOT_ASSESSED"},
            {"id": "evidence_use", "outcome": "NOT_ASSESSED"},
        ],
    }
    pe = {"executed": True, "source": "ANTHROPIC_CLAUDE", "model": "claude-test-fixture"}
    failures = check_live_certification_contract(eval_data, provider_execution=pe)
    assert any("all_criteria_not_assessed" in f for f in failures)


def test_malformed_empty_criteria_not_certified():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "ANTHROPIC_CLAUDE",
        "source_label": "claude",
        "degraded": False,
        "criteria": [],
    }
    pe = {"executed": True, "source": "ANTHROPIC_CLAUDE", "model": "claude-test"}
    failures = check_live_certification_contract(eval_data, provider_execution=pe)
    assert any("criteria_empty" in f for f in failures)


def test_claimed_live_source_without_execution_evidence_not_certified():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "ANTHROPIC_CLAUDE",
        "source_label": "claude",
        "degraded": False,
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
    }
    failures = check_live_certification_contract(eval_data, provider_execution=None)
    assert any("provider_execution_not_proven" in f for f in failures)


def test_structurally_valid_but_semantically_wrong_quality_fail():
    """Long irrelevant marked fully supported → quality FAIL (contract may pass)."""
    case = {"id": "long_irrelevant"}
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "ANTHROPIC_CLAUDE",
        "source_label": "claude",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE", "note": "long text"},
            {"id": "evidence_use", "outcome": "PARTIALLY_SUPPORTED"},
        ],
    }
    pe = {"executed": True, "source": "ANTHROPIC_CLAUDE", "model": "claude-test-fixture"}
    result = check_live_case(case, eval_data, provider_execution=pe)
    assert result["contract_ok"] is True
    assert result["quality_ok"] is False
    assert result["passed"] is False
    assert any("irrelevant_marked_supported" in f for f in result["failures"])


def test_valid_controlled_stub_fixture_passes_harness_not_live_remote():
    """Harness stub with trusted source+model may pass contract; never implies remote Claude."""
    case = {"id": "valid_alternative"}
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "provider_stub_certified",
        "source_label": "provider_stub_certified",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "PARTIALLY_SUPPORTED", "note": "matrix ok"},
            {"id": "structure", "outcome": "PARTIALLY_SUPPORTED"},
        ],
    }
    pe = {
        "executed": True,
        "source": "provider_stub_certified",
        "model": "stub-v1",
        "case_id": "valid_alternative",
    }
    result = check_live_case(case, eval_data, provider_execution=pe)
    assert result["passed"] is True
    assert result["model"] == "stub-v1"


def test_missing_model_metadata_not_certified():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "ANTHROPIC_CLAUDE",
        "source_label": "claude",
        "degraded": False,
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
    }
    pe = {"executed": True, "source": "ANTHROPIC_CLAUDE", "model": ""}
    failures = check_live_certification_contract(eval_data, provider_execution=pe)
    assert any("model_metadata_missing" in f for f in failures)


def test_isolation_identical_identities_must_fail_setup():
    """Negative control: harness must refuse to claim isolation for same user."""
    a = {"user_id": 1, "candidate_id": 10}
    b = {"user_id": 1, "candidate_id": 10}
    with pytest.raises(AssertionError, match="isolation_same"):
        assert_isolation_identities(a, b)


def test_isolation_distinct_identities_ok():
    assert_isolation_identities(
        {"user_id": 1, "candidate_id": 10},
        {"user_id": 2, "candidate_id": 20},
    )


def test_legacy_script_check_case_defect_documented():
    """Negative control proving the OLD script logic was unsafe.

    Recreates the defective acceptance rules (score null + non-empty criteria)
    and shows they would PASS the deterministic consent-denied payload.
    """
    eval_data = DETERMINISTIC_CONSENT_DENIED
    failures = []
    if eval_data.get("score") is not None:
        failures.append("score")
    if eval_data.get("score_available") is True:
        failures.append("score_available")
    criteria = eval_data.get("criteria")
    if not isinstance(criteria, list) or len(criteria) == 0:
        failures.append("criteria")
    # Defective old gate would pass here:
    assert failures == [], "fixture must satisfy the old weak rules"
    # New gate must reject:
    new = check_live_case(
        {"id": "concise_relevant"}, eval_data, provider_execution=None
    )
    assert new["passed"] is False
