"""Fail-closed policy primitives for TWIN model/data trust boundaries.

This module is a pure planning policy, NOT a real security gateway. The caller
must derive user identity, data classification, provenance, destination,
contractual review and network-attestation flags from server-side trusted
configuration; NEVER from an LLM response, retrieved document or email.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from app.services.executive_agent.governance import Domain


class DataClass(str, Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class ModelRuntime(str, Enum):
    PUBLIC_CLOUD = "public_cloud"
    REVIEWED_CLOUD = "reviewed_cloud"
    ISOLATED_LOCAL = "isolated_local"


class SourceKind(str, Enum):
    AUTHENTICATED_USER = "authenticated_user"
    EXTERNAL_EMAIL = "external_email"
    EXTERNAL_DOCUMENT = "external_document"
    WEB_PAGE = "web_page"
    TOOL_RESULT = "tool_result"
    SCHEDULED_POLICY = "scheduled_policy"


class BoundaryDecision(str, Enum):
    ALLOW = "allow"
    REQUIRE_HUMAN_REVIEW = "require_human_review"
    BLOCK = "block"


@dataclass(frozen=True)
class DataRoute:
    source_domain: Domain
    destination_domain: Domain
    classification: DataClass
    runtime: ModelRuntime
    approved_purpose: bool = False
    destination_approved: bool = False
    # Cloud review must include sub-processors and transfer assessments,
    # not just a claim that the endpoint is hosted in the EU.
    contract_and_subprocessors_reviewed: bool = False
    international_transfer_reviewed: bool = False
    # Attestation must cover network egress, logging and provider telemetry.
    local_isolation_verified: bool = False


@dataclass(frozen=True)
class TrustDecision:
    decision: BoundaryDecision
    reasons: tuple[str, ...]


def assess_data_route(route: DataRoute) -> TrustDecision:
    """Evaluate route metadata. Does not inspect raw contents or enforce egress."""
    if route.source_domain != route.destination_domain:
        return TrustDecision(BoundaryDecision.BLOCK, ("cross_tenant_route",))
    if not route.approved_purpose:
        return TrustDecision(BoundaryDecision.BLOCK, ("purpose_not_approved",))
    if not route.destination_approved:
        return TrustDecision(BoundaryDecision.BLOCK, ("destination_not_approved",))

    if route.runtime == ModelRuntime.ISOLATED_LOCAL:
        if not route.local_isolation_verified:
            return TrustDecision(BoundaryDecision.BLOCK, ("local_egress_not_verified",))
        if route.classification == DataClass.RESTRICTED:
            return TrustDecision(
                BoundaryDecision.REQUIRE_HUMAN_REVIEW,
                ("restricted_data_requires_review",),
            )
        return TrustDecision(BoundaryDecision.ALLOW, ("approved_local_processing",))

    if route.classification in {DataClass.CONFIDENTIAL, DataClass.RESTRICTED}:
        return TrustDecision(
            BoundaryDecision.BLOCK,
            ("sensitive_data_cloud_not_enabled_in_v1",),
        )

    if route.classification == DataClass.PUBLIC:
        return TrustDecision(BoundaryDecision.ALLOW, ("public_approved_destination",))

    if route.runtime == ModelRuntime.PUBLIC_CLOUD:
        return TrustDecision(BoundaryDecision.BLOCK, ("internal_data_public_cloud",))
    if route.runtime == ModelRuntime.REVIEWED_CLOUD:
        if not route.contract_and_subprocessors_reviewed:
            return TrustDecision(BoundaryDecision.BLOCK, ("cloud_contract_review_missing",))
        if not route.international_transfer_reviewed:
            return TrustDecision(BoundaryDecision.BLOCK, ("transfer_assessment_missing",))
        return TrustDecision(BoundaryDecision.ALLOW, ("reviewed_cloud_internal_data",))
    return TrustDecision(BoundaryDecision.BLOCK, ("unknown_runtime",))


def assess_instruction_origin(
    source: SourceKind,
    *,
    authenticated_principal: bool = False,
    scheduled_policy_signed: bool = False,
) -> TrustDecision:
    """Treat untrusted external content as data, NEVER as tool authority.

    A trusted origin only permits an instruction to enter the planning path:
    action-level approval, RBAC and tool-call checks are still mandatory.
    """
    if source == SourceKind.AUTHENTICATED_USER:
        if authenticated_principal:
            return TrustDecision(BoundaryDecision.ALLOW, ("authenticated_intent",))
        return TrustDecision(BoundaryDecision.BLOCK, ("principal_not_verified",))
    if source == SourceKind.SCHEDULED_POLICY:
        if scheduled_policy_signed:
            return TrustDecision(BoundaryDecision.ALLOW, ("verified_scheduled_mandate",))
        return TrustDecision(BoundaryDecision.BLOCK, ("scheduled_mandate_not_verified",))
    return TrustDecision(BoundaryDecision.BLOCK, ("external_content_is_data_only",))
