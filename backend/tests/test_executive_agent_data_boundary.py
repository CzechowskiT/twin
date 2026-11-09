"""Boundary regression tests. Pure offline checks; no live API or credentials."""

from dataclasses import replace

from app.services.executive_agent.governance import Domain
from app.services.executive_agent.data_boundary import (
    BoundaryDecision,
    DataClass,
    DataRoute,
    ModelRuntime,
    SourceKind,
    assess_data_route,
    assess_instruction_origin,
)


def base_route(**updates):
    base = DataRoute(
        source_domain=Domain.FUTURE_PROCESSING,
        destination_domain=Domain.FUTURE_PROCESSING,
        classification=DataClass.PUBLIC,
        runtime=ModelRuntime.PUBLIC_CLOUD,
        approved_purpose=True,
        destination_approved=True,
    )
    return replace(base, **updates)


def test_public_information_to_approved_cloud_is_allowed():
    assert assess_data_route(base_route()).decision == BoundaryDecision.ALLOW


def test_missing_purpose_is_blocked():
    result = assess_data_route(base_route(approved_purpose=False))
    assert result.decision == BoundaryDecision.BLOCK


def test_unreviewed_destination_is_blocked():
    assert assess_data_route(base_route(destination_approved=False)).decision == BoundaryDecision.BLOCK


def test_cross_tenant_route_is_blocked():
    route = base_route(destination_domain=Domain.REALADVISOR)
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK


def test_internal_data_cannot_go_to_public_cloud():
    route = base_route(classification=DataClass.INTERNAL)
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK


def test_internal_cloud_requires_both_contract_and_transfer_reviews():
    route = base_route(classification=DataClass.INTERNAL, runtime=ModelRuntime.REVIEWED_CLOUD)
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK
    route = replace(route, contract_and_subprocessors_reviewed=True)
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK
    route = replace(route, international_transfer_reviewed=True)
    assert assess_data_route(route).decision == BoundaryDecision.ALLOW


def test_confidential_cloud_data_is_blocked_even_with_contracts():
    route = base_route(
        classification=DataClass.CONFIDENTIAL,
        runtime=ModelRuntime.REVIEWED_CLOUD,
        contract_and_subprocessors_reviewed=True,
        international_transfer_reviewed=True,
    )
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK


def test_local_model_is_not_trusted_without_verified_egress_controls():
    route = base_route(
        classification=DataClass.CONFIDENTIAL,
        runtime=ModelRuntime.ISOLATED_LOCAL,
    )
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK
    assert assess_data_route(replace(route, local_isolation_verified=True)).decision == BoundaryDecision.ALLOW


def test_restricted_local_requires_human_review():
    route = base_route(
        classification=DataClass.RESTRICTED,
        runtime=ModelRuntime.ISOLATED_LOCAL,
        local_isolation_verified=True,
    )
    assert assess_data_route(route).decision == BoundaryDecision.REQUIRE_HUMAN_REVIEW


def test_restricted_cloud_blocked():
    route = base_route(classification=DataClass.RESTRICTED)
    assert assess_data_route(route).decision == BoundaryDecision.BLOCK


def test_untrusted_external_sources_cannot_authorize_tools():
    for source in (
        SourceKind.EXTERNAL_EMAIL,
        SourceKind.EXTERNAL_DOCUMENT,
        SourceKind.WEB_PAGE,
        SourceKind.TOOL_RESULT,
    ):
        decision = assess_instruction_origin(source, authenticated_principal=True)
        assert decision.decision == BoundaryDecision.BLOCK


def test_direct_user_requires_authenticated_identity():
    assert assess_instruction_origin(SourceKind.AUTHENTICATED_USER).decision == BoundaryDecision.BLOCK
    assert (
        assess_instruction_origin(
            SourceKind.AUTHENTICATED_USER, authenticated_principal=True
        ).decision
        == BoundaryDecision.ALLOW
    )


def test_scheduled_jobs_require_signed_policy():
    assert assess_instruction_origin(SourceKind.SCHEDULED_POLICY).decision == BoundaryDecision.BLOCK
    assert (
        assess_instruction_origin(
            SourceKind.SCHEDULED_POLICY, scheduled_policy_signed=True
        ).decision
        == BoundaryDecision.ALLOW
    )
