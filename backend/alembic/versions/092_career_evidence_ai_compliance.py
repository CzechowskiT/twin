"""Career Evidence Graph & AI Compliance Foundation.

ORM: CareerClaim, CareerEvidenceObject, ClaimEvidenceLink, ClaimDispute,
     ClaimStatusHistory, AiSystemRegistry, AiPromptTemplate, AiDecisionRun,
     AiExplanation, AiHumanReview, AiProhibitedUse, AiInAppNotification
Service: app/services/ai_compliance.py
API: app/api/ai_compliance.py
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md (between Wave 5 and Wave 6)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "092_career_evidence_ai_compliance"
down_revision: Union[str, None] = "091_integrations_wave5_hard_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("career_claims"):
        op.create_table(
            "career_claims",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("claim_id", sa.String(length=64), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("subject_type", sa.String(length=64), nullable=False),
            sa.Column("subject_id", sa.String(length=128), nullable=False),
            sa.Column("claim_type", sa.String(length=64), nullable=False),
            sa.Column("claim_key", sa.String(length=128), nullable=False),
            sa.Column("claim_value", sa.Text(), nullable=False),
            sa.Column("normalized_value", sa.Text(), nullable=True),
            sa.Column("value_schema_version", sa.String(length=32), nullable=False, server_default="1"),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("confidence_method", sa.String(length=64), nullable=True),
            sa.Column("source_type", sa.String(length=64), nullable=False),
            sa.Column("source_id", sa.String(length=128), nullable=True),
            sa.Column("source_uri_or_reference", sa.String(length=500), nullable=True),
            sa.Column("source_hash", sa.String(length=128), nullable=True),
            sa.Column("created_by_actor_type", sa.String(length=32), nullable=False),
            sa.Column("created_by_actor_id", sa.String(length=128), nullable=True),
            sa.Column("valid_from", sa.DateTime(), nullable=True),
            sa.Column("valid_until", sa.DateTime(), nullable=True),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.Column("verified_by", sa.String(length=128), nullable=True),
            sa.Column("disputed_at", sa.DateTime(), nullable=True),
            sa.Column("disputed_by", sa.String(length=128), nullable=True),
            sa.Column("expired_at", sa.DateTime(), nullable=True),
            sa.Column("superseded_by_claim_id", sa.String(length=64), nullable=True),
            sa.Column("model_run_id", sa.String(length=64), nullable=True),
            sa.Column("prompt_version_id", sa.String(length=64), nullable=True),
            sa.Column("evidence_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("human_confirmation_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("human_confirmation_status", sa.String(length=32), nullable=True),
            sa.Column("visibility_scope", sa.String(length=64), nullable=False, server_default="subject"),
            sa.Column("retention_policy", sa.String(length=64), nullable=False, server_default="standard"),
            sa.Column("legal_basis_reference", sa.String(length=128), nullable=True),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("claim_id", name="uq_career_claims_claim_id"),
        )
        op.create_index("ix_career_claims_tenant", "career_claims", ["tenant_id"])
        op.create_index("ix_career_claims_subject", "career_claims", ["subject_type", "subject_id"])
        op.create_index("ix_career_claims_status", "career_claims", ["status"])
        op.create_index("ix_career_claims_owner", "career_claims", ["owner_user_id"])
        op.create_index("ix_career_claims_created", "career_claims", ["created_at"])

    if not _has_table("career_evidence_objects"):
        op.create_table(
            "career_evidence_objects",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("evidence_type", sa.String(length=64), nullable=False),
            sa.Column("source_type", sa.String(length=64), nullable=False),
            sa.Column("source_reference", sa.String(length=500), nullable=True),
            sa.Column("source_hash", sa.String(length=128), nullable=True),
            sa.Column("issuer", sa.String(length=128), nullable=True),
            sa.Column("issued_at", sa.DateTime(), nullable=True),
            sa.Column("received_at", sa.DateTime(), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("verification_method", sa.String(length=64), nullable=True),
            sa.Column("verification_status", sa.String(length=32), nullable=False, server_default="unverified"),
            sa.Column("verification_actor", sa.String(length=128), nullable=True),
            sa.Column("verification_timestamp", sa.DateTime(), nullable=True),
            sa.Column("document_id", sa.String(length=128), nullable=True),
            sa.Column("structured_payload", sa.Text(), nullable=True),
            sa.Column("redacted_payload", sa.Text(), nullable=True),
            sa.Column("sensitivity", sa.String(length=32), nullable=False, server_default="standard"),
            sa.Column("visibility_scope", sa.String(length=64), nullable=False, server_default="subject"),
            sa.Column("retention_policy", sa.String(length=64), nullable=False, server_default="standard"),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("revocation_reason", sa.String(length=255), nullable=True),
            sa.Column("superseded_by", sa.String(length=64), nullable=True),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("evidence_id", name="uq_career_evidence_evidence_id"),
        )
        op.create_index("ix_career_evidence_tenant", "career_evidence_objects", ["tenant_id"])
        op.create_index("ix_career_evidence_type", "career_evidence_objects", ["evidence_type"])
        op.create_index("ix_career_evidence_owner", "career_evidence_objects", ["owner_user_id"])

    if not _has_table("claim_evidence_links"):
        op.create_table(
            "claim_evidence_links",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("claim_id", sa.String(length=64), nullable=False),
            sa.Column("evidence_id", sa.String(length=64), nullable=False),
            sa.Column("link_role", sa.String(length=64), nullable=False, server_default="supports"),
            sa.Column("explicit_multi_link", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_by_actor_id", sa.String(length=128), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("claim_id", "evidence_id", name="uq_claim_evidence_link"),
        )
        op.create_index("ix_claim_evidence_claim", "claim_evidence_links", ["claim_id"])
        op.create_index("ix_claim_evidence_evidence", "claim_evidence_links", ["evidence_id"])

    if not _has_table("claim_status_history"):
        op.create_table(
            "claim_status_history",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("claim_id", sa.String(length=64), nullable=False),
            sa.Column("from_status", sa.String(length=32), nullable=True),
            sa.Column("to_status", sa.String(length=32), nullable=False),
            sa.Column("actor_type", sa.String(length=32), nullable=False),
            sa.Column("actor_id", sa.String(length=128), nullable=True),
            sa.Column("reason_code", sa.String(length=64), nullable=True),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_claim_status_history_claim", "claim_status_history", ["claim_id"])
        op.create_index("ix_claim_status_history_created", "claim_status_history", ["created_at"])

    if not _has_table("claim_disputes"):
        op.create_table(
            "claim_disputes",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("dispute_id", sa.String(length=64), nullable=False),
            sa.Column("claim_id", sa.String(length=64), nullable=False),
            sa.Column("raised_by", sa.String(length=128), nullable=False),
            sa.Column("reason_code", sa.String(length=64), nullable=False),
            sa.Column("free_text", sa.Text(), nullable=True),
            sa.Column("evidence_ids_json", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="OPEN"),
            sa.Column("assigned_to", sa.String(length=128), nullable=True),
            sa.Column("resolution", sa.String(length=64), nullable=True),
            sa.Column("resolution_reason", sa.Text(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("resolved_by", sa.String(length=128), nullable=True),
            sa.Column("appeal_status", sa.String(length=32), nullable=True),
            sa.Column("appeal_deadline", sa.DateTime(), nullable=True),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("dispute_id", name="uq_claim_disputes_dispute_id"),
        )
        op.create_index("ix_claim_disputes_claim", "claim_disputes", ["claim_id"])
        op.create_index("ix_claim_disputes_status", "claim_disputes", ["status"])
        op.create_index("ix_claim_disputes_tenant", "claim_disputes", ["tenant_id"])

    if not _has_table("ai_system_registry"):
        op.create_table(
            "ai_system_registry",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ai_system_id", sa.String(length=64), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("use_case", sa.String(length=128), nullable=False),
            sa.Column("provider", sa.String(length=64), nullable=False),
            sa.Column("model_name", sa.String(length=128), nullable=False),
            sa.Column("model_version", sa.String(length=64), nullable=False),
            sa.Column("deployment_id", sa.String(length=64), nullable=True),
            sa.Column("environment", sa.String(length=32), nullable=False, server_default="production"),
            sa.Column("owner", sa.String(length=64), nullable=False),
            sa.Column("business_owner", sa.String(length=64), nullable=True),
            sa.Column("technical_owner", sa.String(length=64), nullable=True),
            sa.Column("risk_owner", sa.String(length=64), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("risk_classification", sa.String(length=64), nullable=False),
            sa.Column("high_risk_candidate", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("decision_impact", sa.String(length=64), nullable=False),
            sa.Column("human_oversight_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("allowed_personas_json", sa.Text(), nullable=True),
            sa.Column("allowed_tenants_json", sa.Text(), nullable=True),
            sa.Column("input_data_categories_json", sa.Text(), nullable=True),
            sa.Column("output_data_categories_json", sa.Text(), nullable=True),
            sa.Column("protected_attribute_policy", sa.String(length=64), nullable=False, server_default="never_infer"),
            sa.Column("training_data_disclosure", sa.Text(), nullable=True),
            sa.Column("fine_tuning_status", sa.String(length=32), nullable=True),
            sa.Column("prompt_template_ids_json", sa.Text(), nullable=True),
            sa.Column("evaluation_suite", sa.String(length=128), nullable=True),
            sa.Column("baseline_metrics_json", sa.Text(), nullable=True),
            sa.Column("known_limitations", sa.Text(), nullable=True),
            sa.Column("prohibited_uses_json", sa.Text(), nullable=True),
            sa.Column("rollout_strategy", sa.Text(), nullable=True),
            sa.Column("rollback_strategy", sa.Text(), nullable=True),
            sa.Column("monitoring_plan", sa.Text(), nullable=True),
            sa.Column("retention_policy", sa.String(length=64), nullable=False, server_default="ai_logs_90d"),
            sa.Column("introduced_at", sa.DateTime(), nullable=True),
            sa.Column("last_reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("retired_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("ai_system_id", name="uq_ai_system_registry_id"),
        )
        op.create_index("ix_ai_system_status", "ai_system_registry", ["status"])
        op.create_index("ix_ai_system_risk", "ai_system_registry", ["risk_classification"])

    if not _has_table("ai_prompt_templates"):
        op.create_table(
            "ai_prompt_templates",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("prompt_template_id", sa.String(length=64), nullable=False),
            sa.Column("use_case", sa.String(length=128), nullable=False),
            sa.Column("version", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("owner", sa.String(length=64), nullable=False),
            sa.Column("system_prompt_hash", sa.String(length=128), nullable=False),
            sa.Column("user_prompt_schema", sa.Text(), nullable=True),
            sa.Column("variables_json", sa.Text(), nullable=True),
            sa.Column("expected_output_schema", sa.Text(), nullable=True),
            sa.Column("safety_instructions", sa.Text(), nullable=True),
            sa.Column("prohibited_behavior", sa.Text(), nullable=True),
            sa.Column("human_review_requirement", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("test_suite", sa.String(length=128), nullable=True),
            sa.Column("evaluation_result", sa.Text(), nullable=True),
            sa.Column("introduced_at", sa.DateTime(), nullable=True),
            sa.Column("deprecated_at", sa.DateTime(), nullable=True),
            sa.Column("superseded_by", sa.String(length=64), nullable=True),
            sa.Column("rollback_version", sa.String(length=32), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "prompt_template_id",
                "version",
                name="uq_ai_prompt_template_ver",
            ),
        )
        op.create_index("ix_ai_prompt_use_case", "ai_prompt_templates", ["use_case"])
        op.create_index("ix_ai_prompt_status", "ai_prompt_templates", ["status"])

    if not _has_table("ai_decision_runs"):
        op.create_table(
            "ai_decision_runs",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ai_run_id", sa.String(length=64), nullable=False),
            sa.Column("tenant_id", sa.Integer(), nullable=True),
            sa.Column("ai_system_id", sa.String(length=64), nullable=False),
            sa.Column("model_version", sa.String(length=64), nullable=False),
            sa.Column("deployment_id", sa.String(length=64), nullable=True),
            sa.Column("prompt_template_id", sa.String(length=64), nullable=False),
            sa.Column("prompt_version", sa.String(length=32), nullable=False),
            sa.Column("input_reference", sa.String(length=255), nullable=True),
            sa.Column("input_hash", sa.String(length=128), nullable=True),
            sa.Column("input_data_categories_json", sa.Text(), nullable=True),
            sa.Column("output_reference", sa.String(length=255), nullable=True),
            sa.Column("output_hash", sa.String(length=128), nullable=True),
            sa.Column("output_type", sa.String(length=64), nullable=False),
            sa.Column("redacted_input_json", sa.Text(), nullable=True),
            sa.Column("redacted_output_json", sa.Text(), nullable=True),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("confidence_method", sa.String(length=64), nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=True),
            sa.Column("token_usage", sa.Integer(), nullable=True),
            sa.Column("cost_estimate", sa.Float(), nullable=True),
            sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("safety_filter_triggered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("protected_attribute_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("human_review_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("human_review_status", sa.String(length=32), nullable=True),
            sa.Column("human_reviewer", sa.String(length=128), nullable=True),
            sa.Column("human_override", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("override_reason", sa.Text(), nullable=True),
            sa.Column("accepted", sa.Boolean(), nullable=True),
            sa.Column("rejected", sa.Boolean(), nullable=True),
            sa.Column("escalated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_claim_ids_json", sa.Text(), nullable=True),
            sa.Column("affected_subject_ids_json", sa.Text(), nullable=True),
            sa.Column("decision_impact", sa.String(length=64), nullable=True),
            sa.Column("explanation_reference", sa.String(length=64), nullable=True),
            sa.Column("retention_policy", sa.String(length=64), nullable=False, server_default="ai_logs_90d"),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("ai_run_id", name="uq_ai_decision_runs_run_id"),
        )
        op.create_index("ix_ai_decision_tenant", "ai_decision_runs", ["tenant_id"])
        op.create_index("ix_ai_decision_system", "ai_decision_runs", ["ai_system_id"])
        op.create_index("ix_ai_decision_created", "ai_decision_runs", ["created_at"])

    if not _has_table("ai_explanations"):
        op.create_table(
            "ai_explanations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("explanation_id", sa.String(length=64), nullable=False),
            sa.Column("ai_run_id", sa.String(length=64), nullable=False),
            sa.Column("why", sa.Text(), nullable=False),
            sa.Column("based_on_json", sa.Text(), nullable=True),
            sa.Column("data_used_json", sa.Text(), nullable=True),
            sa.Column("data_not_used_json", sa.Text(), nullable=True),
            sa.Column("key_factors_json", sa.Text(), nullable=True),
            sa.Column("counterfactors_json", sa.Text(), nullable=True),
            sa.Column("limitations", sa.Text(), nullable=True),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("uncertainty", sa.Text(), nullable=True),
            sa.Column("human_action_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("prohibited_interpretation", sa.Text(), nullable=True),
            sa.Column("model_and_prompt_version", sa.String(length=128), nullable=True),
            sa.Column("completeness", sa.String(length=32), nullable=False, server_default="PARTIAL"),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("explanation_id", name="uq_ai_explanations_id"),
        )
        op.create_index("ix_ai_explanations_run", "ai_explanations", ["ai_run_id"])

    if not _has_table("ai_human_reviews"):
        op.create_table(
            "ai_human_reviews",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("review_id", sa.String(length=64), nullable=False),
            sa.Column("ai_run_id", sa.String(length=64), nullable=False),
            sa.Column("claim_id", sa.String(length=64), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
            sa.Column("actor", sa.String(length=128), nullable=True),
            sa.Column("actor_role", sa.String(length=64), nullable=True),
            sa.Column("original_output_ref", sa.String(length=255), nullable=True),
            sa.Column("final_outcome", sa.String(length=64), nullable=True),
            sa.Column("reason_code", sa.String(length=64), nullable=True),
            sa.Column("justification", sa.Text(), nullable=True),
            sa.Column("supporting_evidence_json", sa.Text(), nullable=True),
            sa.Column("audit_correlation_id", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("review_id", name="uq_ai_human_reviews_id"),
        )
        op.create_index("ix_ai_human_reviews_run", "ai_human_reviews", ["ai_run_id"])
        op.create_index("ix_ai_human_reviews_status", "ai_human_reviews", ["status"])

    if not _has_table("ai_prohibited_uses"):
        op.create_table(
            "ai_prohibited_uses",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("use_key", sa.String(length=128), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("severity", sa.String(length=32), nullable=False, server_default="PROHIBITED"),
            sa.Column("block_provider_call", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("use_key", name="uq_ai_prohibited_use_key"),
        )

    if not _has_table("ai_in_app_notifications"):
        op.create_table(
            "ai_in_app_notifications",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("notification_id", sa.String(length=64), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("kind", sa.String(length=64), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("read_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("notification_id", name="uq_ai_in_app_notifications_id"),
        )
        op.create_index("ix_ai_in_app_notifications_user", "ai_in_app_notifications", ["user_id"])


def downgrade() -> None:
    for table, indexes in (
        ("ai_in_app_notifications", ["ix_ai_in_app_notifications_user"]),
        ("ai_prohibited_uses", []),
        ("ai_human_reviews", ["ix_ai_human_reviews_run", "ix_ai_human_reviews_status"]),
        ("ai_explanations", ["ix_ai_explanations_run"]),
        ("ai_decision_runs", ["ix_ai_decision_tenant", "ix_ai_decision_system", "ix_ai_decision_created"]),
        ("ai_prompt_templates", ["ix_ai_prompt_use_case", "ix_ai_prompt_status"]),
        ("ai_system_registry", ["ix_ai_system_status", "ix_ai_system_risk"]),
        ("claim_disputes", ["ix_claim_disputes_claim", "ix_claim_disputes_status", "ix_claim_disputes_tenant"]),
        ("claim_status_history", ["ix_claim_status_history_claim", "ix_claim_status_history_created"]),
        ("claim_evidence_links", ["ix_claim_evidence_claim", "ix_claim_evidence_evidence"]),
        (
            "career_evidence_objects",
            ["ix_career_evidence_tenant", "ix_career_evidence_type", "ix_career_evidence_owner"],
        ),
        (
            "career_claims",
            [
                "ix_career_claims_tenant",
                "ix_career_claims_subject",
                "ix_career_claims_status",
                "ix_career_claims_owner",
                "ix_career_claims_created",
            ],
        ),
    ):
        if _has_table(table):
            for idx in indexes:
                op.drop_index(idx, table_name=table)
            op.drop_table(table)
