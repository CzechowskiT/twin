"""Strategy Review + Decision Governance.

Revision ID: 120_strategy_review_decision_governance
Revises: 119_search_outcome_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "120_strategy_review_decision_governance"
down_revision: Union[str, None] = "119_search_outcome_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_strategy_review_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("review_key", sa.String(length=160), nullable=False),
        sa.Column("cadence", sa.String(length=32), nullable=False, server_default="weekly"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("sections_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("snapshot_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("snapshot_hash", sa.String(length=64), nullable=True),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("spawns_tasks", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "review_key", name="uq_strategy_review_session_key"),
    )
    op.create_index("ix_strategy_review_sessions_candidate_id", "candidate_strategy_review_sessions", ["candidate_id"])

    op.create_table(
        "candidate_strategy_review_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("review_id", sa.Integer(), sa.ForeignKey("candidate_strategy_review_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("observation_key", sa.String(length=160), nullable=False),
        sa.Column("source_module", sa.String(length=64), nullable=False),
        sa.Column("source_ref_id", sa.Integer(), nullable=True),
        sa.Column("lineage_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "observation_key", name="uq_strategy_review_obs_key"),
    )
    op.create_index("ix_strategy_review_obs_candidate_id", "candidate_strategy_review_observations", ["candidate_id"])

    op.create_table(
        "candidate_opportunity_cluster_summaries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cluster_key", sa.String(length=160), nullable=False),
        sa.Column("label", sa.String(length=300), nullable=False),
        sa.Column("summary_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("opportunity_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=64), nullable=False, server_default="INSUFFICIENT_DATA"),
        sa.Column("demand_claim", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("fabricated_progress", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "cluster_key", name="uq_opp_cluster_summary_key"),
    )
    op.create_index("ix_opp_cluster_summaries_candidate_id", "candidate_opportunity_cluster_summaries", ["candidate_id"])

    op.create_table(
        "candidate_strategy_assumptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assumption_key", sa.String(length=160), nullable=False),
        sa.Column("statement", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("evaluation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "assumption_key", name="uq_strategy_assumption_key"),
    )
    op.create_index("ix_strategy_assumptions_candidate_id", "candidate_strategy_assumptions", ["candidate_id"])

    op.create_table(
        "candidate_decision_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("decision_key", sa.String(length=160), nullable=False),
        sa.Column("review_id", sa.Integer(), nullable=True),
        sa.Column("question_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_package_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("alternatives_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("counterfactuals_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("rationale_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("decision_hash", sa.String(length=64), nullable=True),
        sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("change_set_id", sa.Integer(), nullable=True),
        sa.Column("executed_at", sa.DateTime(), nullable=True),
        sa.Column("execution_idempotency_key", sa.String(length=160), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "decision_key", name="uq_decision_record_key"),
    )
    op.create_index("ix_decision_records_candidate_id", "candidate_decision_records", ["candidate_id"])

    op.create_table(
        "candidate_strategy_change_sets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("change_set_key", sa.String(length=160), nullable=False),
        sa.Column("decision_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("impact_preview_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("execution_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reverted_from_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "change_set_key", name="uq_strategy_change_set_key"),
    )
    op.create_index("ix_strategy_change_sets_candidate_id", "candidate_strategy_change_sets", ["candidate_id"])

    op.create_table(
        "candidate_decision_followups",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("followup_key", sa.String(length=160), nullable=False),
        sa.Column("decision_id", sa.Integer(), sa.ForeignKey("candidate_decision_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="observe"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "followup_key", name="uq_decision_followup_key"),
    )
    op.create_index("ix_decision_followups_candidate_id", "candidate_decision_followups", ["candidate_id"])

    op.create_table(
        "candidate_strategy_review_audits",
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
    op.create_index("ix_strategy_review_audits_candidate_id", "candidate_strategy_review_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_strategy_review_audits")
    op.drop_table("candidate_decision_followups")
    op.drop_table("candidate_strategy_change_sets")
    op.drop_table("candidate_decision_records")
    op.drop_table("candidate_strategy_assumptions")
    op.drop_table("candidate_opportunity_cluster_summaries")
    op.drop_table("candidate_strategy_review_observations")
    op.drop_table("candidate_strategy_review_sessions")
