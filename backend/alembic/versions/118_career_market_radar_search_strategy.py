"""Career Market Radar + Search Strategy Lab + Evidence-Based Job Search Portfolio.

Revision ID: 118_career_market_radar_search_strategy
Revises: 117_opportunity_market_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "118_career_market_radar_search_strategy"
down_revision: Union[str, None] = "117_opportunity_market_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_search_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("thesis_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("allocation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("coverage_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("health_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("simulation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("activated_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "strategy_key", name="uq_search_strategy_key"),
    )
    op.create_index("ix_search_strategies_candidate_id", "candidate_search_strategies", ["candidate_id"])

    op.create_table(
        "candidate_role_theses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("thesis_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("gap_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "thesis_key", name="uq_role_thesis_key"),
    )
    op.create_index("ix_role_theses_candidate_id", "candidate_role_theses", ["candidate_id"])

    op.create_table(
        "candidate_search_portfolios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("portfolio_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("allocations_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("balance_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("watchlist_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("saved_search_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("opportunity_refs_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "portfolio_key", name="uq_search_portfolio_key"),
    )
    op.create_index("ix_search_portfolios_candidate_id", "candidate_search_portfolios", ["candidate_id"])

    op.create_table(
        "candidate_search_experiments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("experiment_key", sa.String(length=160), nullable=False),
        sa.Column("hypothesis_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("observations_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("silent_weight_change", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("requires_approval_for_weights", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "experiment_key", name="uq_search_experiment_key"),
    )
    op.create_index("ix_search_experiments_candidate_id", "candidate_search_experiments", ["candidate_id"])

    op.create_table(
        "candidate_search_cycles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cycle_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("history_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("spawns_tasks", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "cycle_key", name="uq_search_cycle_key"),
    )
    op.create_index("ix_search_cycles_candidate_id", "candidate_search_cycles", ["candidate_id"])

    op.create_table(
        "candidate_gap_observations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=True),
        sa.Column("gap_key", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="requirement"),
        sa.Column("observation_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("keyword_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("evidence_backed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("investment_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "gap_key", name="uq_gap_observation_key"),
    )
    op.create_index("ix_gap_observations_candidate_id", "candidate_gap_observations", ["candidate_id"])

    op.create_table(
        "candidate_source_coverage_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("metrics_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("wording", sa.String(length=64), nullable=False, server_default="observed_source"),
        sa.Column("whole_market_claim", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_source_coverage_key"),
    )

    op.create_table(
        "candidate_portfolio_health_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("portfolio_id", sa.Integer(), sa.ForeignKey("candidate_search_portfolios.id", ondelete="CASCADE"), nullable=True),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("health_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_portfolio_health_key"),
    )

    op.create_table(
        "candidate_strategy_reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("candidate_search_strategies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("review_key", sa.String(length=160), nullable=False),
        sa.Column("cadence", sa.String(length=32), nullable=False, server_default="weekly"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("approved_changes_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "review_key", name="uq_strategy_review_key"),
    )
    op.create_index("ix_strategy_reviews_candidate_id", "candidate_strategy_reviews", ["candidate_id"])

    op.create_table(
        "candidate_search_strategy_audits",
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
    op.create_index("ix_search_strategy_audits_candidate_id", "candidate_search_strategy_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_search_strategy_audits_candidate_id", table_name="candidate_search_strategy_audits")
    op.drop_table("candidate_search_strategy_audits")
    op.drop_index("ix_strategy_reviews_candidate_id", table_name="candidate_strategy_reviews")
    op.drop_table("candidate_strategy_reviews")
    op.drop_table("candidate_portfolio_health_snapshots")
    op.drop_table("candidate_source_coverage_snapshots")
    op.drop_index("ix_gap_observations_candidate_id", table_name="candidate_gap_observations")
    op.drop_table("candidate_gap_observations")
    op.drop_index("ix_search_cycles_candidate_id", table_name="candidate_search_cycles")
    op.drop_table("candidate_search_cycles")
    op.drop_index("ix_search_experiments_candidate_id", table_name="candidate_search_experiments")
    op.drop_table("candidate_search_experiments")
    op.drop_index("ix_search_portfolios_candidate_id", table_name="candidate_search_portfolios")
    op.drop_table("candidate_search_portfolios")
    op.drop_index("ix_role_theses_candidate_id", table_name="candidate_role_theses")
    op.drop_table("candidate_role_theses")
    op.drop_index("ix_search_strategies_candidate_id", table_name="candidate_search_strategies")
    op.drop_table("candidate_search_strategies")
