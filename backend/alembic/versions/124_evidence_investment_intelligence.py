"""Evidence Investment Intelligence — career experimentation + allocation learning.

Revision ID: 124_evidence_investment_intelligence
Revises: 123_adaptive_execution_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "124_evidence_investment_intelligence"
down_revision: Union[str, None] = "123_adaptive_execution_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _std_tail():
    return [
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "candidate_investment_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("title", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "question_key", name="uq_investment_question_key"),
    )
    op.create_index("ix_investment_questions_candidate_id", "candidate_investment_questions", ["candidate_id"])

    op.create_table(
        "candidate_evidence_gap_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=True),
        sa.Column("gaps_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("provenance_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("absence_means_no_skill", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_evidence_gap_snapshot_key"),
    )
    op.create_index("ix_evidence_gap_snapshots_candidate_id", "candidate_evidence_gap_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_investment_experiments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("experiment_key", sa.String(length=160), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=True),
        sa.Column("gap_snapshot_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("hypothesis_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("alternatives_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("selected_alternative_id", sa.String(length=64), nullable=True),
        sa.Column("plan_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("creates_commitments_on_reject", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_purchase", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_enrollment", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "experiment_key", name="uq_investment_experiment_key"),
    )
    op.create_index("ix_investment_experiments_candidate_id", "candidate_investment_experiments", ["candidate_id"])

    op.create_table(
        "candidate_investment_simulations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("simulation_key", sa.String(length=160), nullable=False),
        sa.Column("experiment_id", sa.Integer(), nullable=True),
        sa.Column("mutates_state", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "simulation_key", name="uq_investment_simulation_key"),
    )
    op.create_index("ix_investment_simulations_candidate_id", "candidate_investment_simulations", ["candidate_id"])

    op.create_table(
        "candidate_investment_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("observation_key", sa.String(length=160), nullable=False),
        sa.Column("experiment_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="execution"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "observation_key", name="uq_investment_observation_key"),
    )
    op.create_index("ix_investment_observations_candidate_id", "candidate_investment_observations", ["candidate_id"])

    op.create_table(
        "candidate_investment_artifact_drafts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("draft_key", sa.String(length=160), nullable=False),
        sa.Column("experiment_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("title", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("ref_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("influences_ranking", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("external_acceptance", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "draft_key", name="uq_investment_artifact_draft_key"),
    )
    op.create_index("ix_investment_artifact_drafts_candidate_id", "candidate_investment_artifact_drafts", ["candidate_id"])

    op.create_table(
        "candidate_investment_promotions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("promotion_key", sa.String(length=160), nullable=False),
        sa.Column("draft_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "promotion_key", name="uq_investment_promotion_key"),
    )
    op.create_index("ix_investment_promotions_candidate_id", "candidate_investment_promotions", ["candidate_id"])

    op.create_table(
        "candidate_investment_usefulness",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("usefulness_key", sa.String(length=160), nullable=False),
        sa.Column("experiment_id", sa.Integer(), nullable=True),
        sa.Column("draft_id", sa.Integer(), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("causal_outcome", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "usefulness_key", name="uq_investment_usefulness_key"),
    )
    op.create_index("ix_investment_usefulness_candidate_id", "candidate_investment_usefulness", ["candidate_id"])

    op.create_table(
        "candidate_allocation_calibrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calibration_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "calibration_key", name="uq_allocation_calibration_key"),
    )
    op.create_index("ix_allocation_calibrations_candidate_id", "candidate_allocation_calibrations", ["candidate_id"])

    op.create_table(
        "candidate_allocation_policies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("policy_key", sa.String(length=160), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "policy_key", name="uq_allocation_policy_key"),
    )
    op.create_index("ix_allocation_policies_candidate_id", "candidate_allocation_policies", ["candidate_id"])

    op.create_table(
        "candidate_investment_portfolio_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        *_std_tail(),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_investment_portfolio_snap_key"),
    )
    op.create_index("ix_investment_portfolio_snaps_candidate_id", "candidate_investment_portfolio_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_investment_audits",
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
    op.create_index("ix_investment_audits_candidate_id", "candidate_investment_audits", ["candidate_id"])


def downgrade() -> None:
    for name, idx in [
        ("candidate_investment_audits", "ix_investment_audits_candidate_id"),
        ("candidate_investment_portfolio_snapshots", "ix_investment_portfolio_snaps_candidate_id"),
        ("candidate_allocation_policies", "ix_allocation_policies_candidate_id"),
        ("candidate_allocation_calibrations", "ix_allocation_calibrations_candidate_id"),
        ("candidate_investment_usefulness", "ix_investment_usefulness_candidate_id"),
        ("candidate_investment_promotions", "ix_investment_promotions_candidate_id"),
        ("candidate_investment_artifact_drafts", "ix_investment_artifact_drafts_candidate_id"),
        ("candidate_investment_observations", "ix_investment_observations_candidate_id"),
        ("candidate_investment_simulations", "ix_investment_simulations_candidate_id"),
        ("candidate_investment_experiments", "ix_investment_experiments_candidate_id"),
        ("candidate_evidence_gap_snapshots", "ix_evidence_gap_snapshots_candidate_id"),
        ("candidate_investment_questions", "ix_investment_questions_candidate_id"),
    ]:
        op.drop_index(idx, table_name=name)
        op.drop_table(name)
