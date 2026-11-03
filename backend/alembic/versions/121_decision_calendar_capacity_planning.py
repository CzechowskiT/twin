"""Decision-to-Calendar Execution + Capacity Planning.

Revision ID: 121_decision_calendar_capacity_planning
Revises: 120_strategy_review_decision_governance
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "121_decision_calendar_capacity_planning"
down_revision: Union[str, None] = "120_strategy_review_decision_governance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_execution_requirements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requirement_key", sa.String(length=160), nullable=False),
        sa.Column("decision_id", sa.Integer(), nullable=True),
        sa.Column("change_set_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("effort_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("spawns_commitments", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "requirement_key", name="uq_execution_requirement_key"),
    )
    op.create_index("ix_execution_requirements_candidate_id", "candidate_execution_requirements", ["candidate_id"])

    op.create_table(
        "candidate_capacity_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_key", sa.String(length=160), nullable=False),
        sa.Column("weekly_budget_minutes", sa.Integer(), nullable=True),
        sa.Column("timezone_name", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("windows_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("protected_focus_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explicit_budget_only", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("inferred_obligations", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_CONFIRMED"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "profile_key", name="uq_capacity_profile_key"),
    )
    op.create_index("ix_capacity_profiles_candidate_id", "candidate_capacity_profiles", ["candidate_id"])

    op.create_table(
        "candidate_availability_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("source_mode", sa.String(length=32), nullable=False, server_default="internal_only"),
        sa.Column("timezone_name", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("windows_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("busy_blocks_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("fabricated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("unknown_availability", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ms_consent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_availability_snapshot_key"),
    )
    op.create_index("ix_availability_snapshots_candidate_id", "candidate_availability_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_commitment_batches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("batch_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("snapshot_id", sa.Integer(), nullable=True),
        sa.Column("feasibility_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("alternatives_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_created", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "batch_key", name="uq_commitment_batch_key"),
    )
    op.create_index("ix_commitment_batches_candidate_id", "candidate_commitment_batches", ["candidate_id"])

    op.create_table(
        "candidate_commitment_batch_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_key", sa.String(length=160), nullable=False),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("candidate_commitment_batches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("requirement_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="proposed"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("effort_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("is_hold", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("external_created", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acal_item_key", sa.String(length=160), nullable=True),
        sa.Column("progress_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "item_key", name="uq_commitment_batch_item_key"),
    )
    op.create_index("ix_commitment_batch_items_candidate_id", "candidate_commitment_batch_items", ["candidate_id"])

    op.create_table(
        "candidate_calendar_conflicts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("conflict_key", sa.String(length=160), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="overlap"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "conflict_key", name="uq_calendar_conflict_key"),
    )
    op.create_index("ix_calendar_conflicts_candidate_id", "candidate_calendar_conflicts", ["candidate_id"])

    op.create_table(
        "candidate_calendar_execution_audits",
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
    op.create_index("ix_calendar_execution_audits_candidate_id", "candidate_calendar_execution_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_calendar_execution_audits")
    op.drop_table("candidate_calendar_conflicts")
    op.drop_table("candidate_commitment_batch_items")
    op.drop_table("candidate_commitment_batches")
    op.drop_table("candidate_availability_snapshots")
    op.drop_table("candidate_capacity_profiles")
    op.drop_table("candidate_execution_requirements")
