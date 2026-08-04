"""Outcome-calibrated strategy + candidate-controlled internal execution.

Revision ID: 116_outcome_calibrated_execution
Revises: 115_unified_career_lifecycle
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "116_outcome_calibrated_execution"
down_revision: Union[str, None] = "115_unified_career_lifecycle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_strategy_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_key", sa.String(length=160), nullable=False),
        sa.Column("objectives_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("constraints_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("preferences_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("consistency_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("simulation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "profile_key", name="uq_strategy_profile_key"),
    )
    op.create_index("ix_strategy_profiles_candidate_id", "candidate_strategy_profiles", ["candidate_id"])

    op.create_table(
        "candidate_ranking_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("weights_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("candidates_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("counterfactuals_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("attribution_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="canonical"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("superseded_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_ranking_snapshot_key"),
    )
    op.create_index("ix_ranking_snapshots_candidate_id", "candidate_ranking_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_calibration_proposals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proposal_key", sa.String(length=160), nullable=False),
        sa.Column("from_transition_cal_id", sa.Integer(), nullable=True),
        sa.Column("before_weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("outcome_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("bundled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("merged_weights_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "proposal_key", name="uq_calibration_proposal_key"),
    )

    op.create_table(
        "candidate_execution_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("external_actions", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("deps_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("approval_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("replay_state_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "plan_key", name="uq_execution_plan_key"),
        sa.UniqueConstraint("candidate_id", "idempotency_key", name="uq_execution_plan_idem"),
    )
    op.create_index("ix_execution_plans_candidate_id", "candidate_execution_plans", ["candidate_id"])

    op.create_table(
        "candidate_execution_steps",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("candidate_execution_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_key", sa.String(length=160), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("internal_only", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("external", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("deps_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("payload_ref_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("error_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "step_key", name="uq_execution_step_key"),
    )

    op.create_table(
        "candidate_deletion_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("preview_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("graph_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("progress_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "job_key", name="uq_deletion_job_key"),
    )

    op.create_table(
        "candidate_privacy_revocation_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_key", sa.String(length=160), nullable=False),
        sa.Column("scope_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("executed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "job_key", name="uq_privacy_revocation_job_key"),
    )

    op.create_table(
        "candidate_strategy_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_strategy_audits_candidate_id", "candidate_strategy_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_strategy_audits_candidate_id", table_name="candidate_strategy_audits")
    op.drop_table("candidate_strategy_audits")
    op.drop_table("candidate_privacy_revocation_jobs")
    op.drop_table("candidate_deletion_jobs")
    op.drop_table("candidate_execution_steps")
    op.drop_index("ix_execution_plans_candidate_id", table_name="candidate_execution_plans")
    op.drop_table("candidate_execution_plans")
    op.drop_table("candidate_calibration_proposals")
    op.drop_index("ix_ranking_snapshots_candidate_id", table_name="candidate_ranking_snapshots")
    op.drop_table("candidate_ranking_snapshots")
    op.drop_index("ix_strategy_profiles_candidate_id", table_name="candidate_strategy_profiles")
    op.drop_table("candidate_strategy_profiles")
