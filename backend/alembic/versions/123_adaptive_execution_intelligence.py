"""Adaptive Execution Intelligence — estimation + capacity calibration.

Revision ID: 123_adaptive_execution_intelligence
Revises: 122_read_only_calendar_sync
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "123_adaptive_execution_intelligence"
down_revision: Union[str, None] = "122_read_only_calendar_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_execution_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("observation_key", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="progress"),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_DECLARED"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "observation_key", name="uq_exec_observation_key"),
    )
    op.create_index("ix_exec_observations_candidate_id", "candidate_execution_observations", ["candidate_id"])

    op.create_table(
        "candidate_estimate_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="requirement"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_estimate_snapshot_key"),
    )
    op.create_index("ix_estimate_snapshots_candidate_id", "candidate_estimate_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_estimate_comparisons",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("comparison_key", sa.String(length=160), nullable=False),
        sa.Column("snapshot_id", sa.Integer(), nullable=True),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actual_minutes", sa.Integer(), nullable=True),
        sa.Column("delta_minutes", sa.Integer(), nullable=True),
        sa.Column("ratio_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="OBSERVED_INTERNAL_STATE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "comparison_key", name="uq_estimate_comparison_key"),
    )
    op.create_index("ix_estimate_comparisons_candidate_id", "candidate_estimate_comparisons", ["candidate_id"])

    op.create_table(
        "candidate_estimation_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("factors_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "profile_key", name="uq_estimation_profile_key"),
    )
    op.create_index("ix_estimation_profiles_candidate_id", "candidate_estimation_profiles", ["candidate_id"])

    op.create_table(
        "candidate_estimate_calibrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calibration_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "calibration_key", name="uq_estimate_calibration_key"),
    )
    op.create_index("ix_estimate_calibrations_candidate_id", "candidate_estimate_calibrations", ["candidate_id"])

    op.create_table(
        "candidate_commitment_quality_analyses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_key", sa.String(length=160), nullable=False),
        sa.Column("scope", sa.String(length=32), nullable=False, server_default="batch"),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "analysis_key", name="uq_commitment_quality_key"),
    )
    op.create_index("ix_commitment_quality_candidate_id", "candidate_commitment_quality_analyses", ["candidate_id"])

    op.create_table(
        "candidate_capacity_calibrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calibration_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "calibration_key", name="uq_capacity_calibration_key"),
    )
    op.create_index("ix_capacity_calibrations_candidate_id", "candidate_capacity_calibrations", ["candidate_id"])

    op.create_table(
        "candidate_execution_policies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("policy_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "policy_key", name="uq_execution_policy_key"),
    )
    op.create_index("ix_execution_policies_candidate_id", "candidate_execution_policies", ["candidate_id"])

    op.create_table(
        "candidate_execution_simulations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_key", sa.String(length=160), nullable=False),
        sa.Column("policy_id", sa.Integer(), nullable=True),
        sa.Column("mutates_state", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "simulation_key", name="uq_execution_simulation_key"),
    )
    op.create_index("ix_execution_simulations_candidate_id", "candidate_execution_simulations", ["candidate_id"])

    op.create_table(
        "candidate_adaptive_execution_audits",
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
    op.create_index("ix_adaptive_exec_audits_candidate_id", "candidate_adaptive_execution_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_adaptive_exec_audits_candidate_id", table_name="candidate_adaptive_execution_audits")
    op.drop_table("candidate_adaptive_execution_audits")
    op.drop_index("ix_execution_simulations_candidate_id", table_name="candidate_execution_simulations")
    op.drop_table("candidate_execution_simulations")
    op.drop_index("ix_execution_policies_candidate_id", table_name="candidate_execution_policies")
    op.drop_table("candidate_execution_policies")
    op.drop_index("ix_capacity_calibrations_candidate_id", table_name="candidate_capacity_calibrations")
    op.drop_table("candidate_capacity_calibrations")
    op.drop_index("ix_commitment_quality_candidate_id", table_name="candidate_commitment_quality_analyses")
    op.drop_table("candidate_commitment_quality_analyses")
    op.drop_index("ix_estimate_calibrations_candidate_id", table_name="candidate_estimate_calibrations")
    op.drop_table("candidate_estimate_calibrations")
    op.drop_index("ix_estimation_profiles_candidate_id", table_name="candidate_estimation_profiles")
    op.drop_table("candidate_estimation_profiles")
    op.drop_index("ix_estimate_comparisons_candidate_id", table_name="candidate_estimate_comparisons")
    op.drop_table("candidate_estimate_comparisons")
    op.drop_index("ix_estimate_snapshots_candidate_id", table_name="candidate_estimate_snapshots")
    op.drop_table("candidate_estimate_snapshots")
    op.drop_index("ix_exec_observations_candidate_id", table_name="candidate_execution_observations")
    op.drop_table("candidate_execution_observations")
