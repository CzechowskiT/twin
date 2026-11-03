"""Epic 2.26 — live AI gate validator integrity + negative controls.

Demonstrates stubs / INVALID_OUTCOME / mismatched case cannot certify LIVE quality.
"""

from __future__ import annotations

import pytest

from app.services.live_ai_quality_validator import (
    assert_isolation_identities,
    check_harness_case,
    check_live_case,
    check_live_certification_contract,
)
from app.services.provider_execution_metadata import (
    KIND_LIVE,
    KIND_STUB,
    PROVIDER_ANTHROPIC,
    PROVIDER_HARNESS,
    build_execution,
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


def _live_pe(**kwargs):
    base = build_execution(
        kind=KIND_LIVE,
        provider=PROVIDER_ANTHROPIC,
        status="completed",
        configured_model="claude-test-fixture",
        returned_model="claude-test-fixture",
        provider_request_id="msg_test_1",
        input_turn_id=1,
        input_revision=2,
        prompt_version="practice_eval_v1",
    )
    base.update(kwargs)
    return base


def test_deterministic_not_assessed_must_fail_live_certification():
    case = {"id": "concise_relevant", "expect_criteria_present": True}
    result = check_live_case(case, DETERMINISTIC_CONSENT_DENIED, provider_execution=None)
    assert result["passed"] is False
    assert result["contract_ok"] is False
    joined = " ".join(result["failures"])
    assert "non_live_source" in joined or "consent_denied" in joined


def test_stub_with_invalid_outcome_cannot_certify_live():
    """REGRESSION: previously provider_stub_certified + INVALID_OUTCOME + wrong case_id PASSed."""
    case = {"id": "concise_relevant"}
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "provider_stub_certified",
        "source_label": "provider_stub_certified",
        "evaluation_status": "COMPLETED",
        "degraded": False,
        "consent_denied": False,
        "criteria": [
            {"id": "relevance", "outcome": "INVALID_OUTCOME", "note": "x"},
            {"id": "specificity", "outcome": "SUPPORTED_IN_RESPONSE", "note": "y"},
        ],
        "provider_execution": build_execution(
            kind=KIND_STUB,
            provider=PROVIDER_HARNESS,
            status="completed",
            returned_model="synthetic-harness",
        ),
    }
    # force mismatched case_id on PE
    eval_data["provider_execution"]["case_id"] = "OTHER_CASE"
    result = check_live_case(
        case,
        eval_data,
        provider_execution=eval_data["provider_execution"],
        expected={"case_id": "concise_relevant", "turn_id": 9, "revision": 1},
    )
    assert result["passed"] is False
    assert result["contract_ok"] is False
    joined = " ".join(result["failures"])
    assert "non_live_source" in joined or "provider_execution_not_live" in joined
    assert "criterion_invalid_outcome" in joined or "non_live" in joined


def test_harness_stub_can_pass_harness_not_live():
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
        "provider_execution": build_execution(
            kind=KIND_STUB,
            provider=PROVIDER_HARNESS,
            status="completed",
            returned_model="stub-v1",
        ),
    }
    harness = check_harness_case(case, eval_data)
    assert harness["passed"] is True
    assert harness["verification_kind"] == "HARNESS_VERIFIED"
    assert harness.get("live_certified") is False
    live = check_live_case(case, eval_data)
    assert live["passed"] is False


def test_unknown_outcome_cannot_pass_even_with_live_meta():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "INVALID_OUTCOME"},
            {"id": "structure", "outcome": "PARTIALLY_SUPPORTED"},
        ],
        "provider_execution": _live_pe(),
    }
    failures = check_live_certification_contract(eval_data)
    assert any("criterion_invalid_outcome" in f for f in failures)


def test_wrong_input_turn_cannot_pass():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
        "provider_execution": _live_pe(input_turn_id=1, input_revision=2),
    }
    failures = check_live_certification_contract(
        eval_data, expected={"turn_id": 99, "revision": 2, "case_id": "x"}
    )
    assert any("input_turn_mismatch" in f for f in failures)


def test_missing_provider_metadata_cannot_pass():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
    }
    failures = check_live_certification_contract(eval_data, provider_execution=None)
    assert any("provider_execution_metadata_missing" in f for f in failures)


def test_replayed_execution_id_cannot_pass():
    pe = _live_pe(execution_id="exec-original")
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
        "provider_execution": pe,
    }
    failures = check_live_certification_contract(
        eval_data, expected={"execution_id": "exec-other", "turn_id": 1, "revision": 2}
    )
    assert any("execution_id_replay" in f for f in failures)


def test_malformed_criterion_mixed_with_valid_fails():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"},
            "not-a-dict",
            {"id": "structure", "outcome": "SUPPORTED_IN_RESPONSE"},
        ],
        "provider_execution": _live_pe(),
    }
    failures = check_live_certification_contract(eval_data)
    assert any("criterion_malformed" in f for f in failures)


def test_source_label_alone_cannot_prove_execution():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [{"id": "relevance", "outcome": "PARTIALLY_SUPPORTED"}],
    }
    # Client-synthesized executed=true without server meta must fail
    pe = {"executed": True, "source": "claude", "model": "claude-live"}
    failures = check_live_certification_contract(eval_data, provider_execution=pe)
    assert any(
        "provider_execution_not_live" in f or "provider_execution_metadata_missing" in f
        for f in failures
    )


def test_structurally_valid_but_semantically_wrong_quality_fail():
    case = {"id": "long_irrelevant"}
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "SUPPORTED_IN_RESPONSE", "note": "long text"},
            {"id": "evidence_use", "outcome": "PARTIALLY_SUPPORTED"},
        ],
        "provider_execution": _live_pe(),
    }
    result = check_live_case(case, eval_data)
    assert result["contract_ok"] is True
    assert result["quality_ok"] is False
    assert result["passed"] is False


def test_all_not_assessed_not_certified_even_with_live_label():
    eval_data = {
        "score": None,
        "score_available": False,
        "source": "claude",
        "source_label": "live_ai",
        "degraded": False,
        "evaluation_status": "COMPLETE",
        "criteria": [
            {"id": "relevance", "outcome": "NOT_ASSESSED"},
            {"id": "evidence_use", "outcome": "NOT_ASSESSED"},
        ],
        "provider_execution": _live_pe(),
    }
    failures = check_live_certification_contract(eval_data)
    assert any(
        "criterion_invalid_outcome" in f or "all_criteria_not_assessed" in f for f in failures
    )


def test_isolation_identical_identities_must_fail_setup():
    a = {"user_id": 1, "candidate_id": 10}
    b = {"user_id": 1, "candidate_id": 10}
    with pytest.raises(AssertionError, match="isolation_same"):
        assert_isolation_identities(a, b)


def test_isolation_distinct_identities_ok():
    assert_isolation_identities(
        {"user_id": 1, "candidate_id": 10},
        {"user_id": 2, "candidate_id": 20},
    )
