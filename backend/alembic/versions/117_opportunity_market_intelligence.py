"""Evidence-backed opportunity discovery + market intelligence.

Revision ID: 117_opportunity_market_intelligence
Revises: 116_outcome_calibrated_execution
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "117_opportunity_market_intelligence"
down_revision: Union[str, None] = "116_outcome_calibrated_execution"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "opportunity_sources",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_key", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="board"),
        sa.Column("board_id", sa.String(length=64), nullable=True),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("base_url", sa.String(length=500), nullable=True),
        sa.Column("config_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("policy_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("authorized_path", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_ok_at", sa.DateTime(), nullable=True),
        sa.Column("last_error", sa.String(length=300), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key", name="uq_opportunity_source_key"),
    )

    op.create_table(
        "candidate_normalized_opportunities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("opportunity_key", sa.String(length=160), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_id", sa.Integer(), sa.ForeignKey("opportunity_sources.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("company", sa.String(length=200), nullable=False),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("url", sa.String(length=500), nullable=True),
        sa.Column("dedupe_key", sa.String(length=200), nullable=False),
        sa.Column("cluster_key", sa.String(length=160), nullable=True),
        sa.Column("normalized_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("requirements_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("freshness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("fit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("market_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("salary_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("company_intel_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("readiness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("activity_status", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("stale", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SOURCE_SUPPORTED"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("superseded_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "opportunity_key", name="uq_norm_opp_key"),
    )
    op.create_index("ix_norm_opp_candidate_id", "candidate_normalized_opportunities", ["candidate_id"])
    op.create_index("ix_norm_opp_dedupe", "candidate_normalized_opportunities", ["candidate_id", "dedupe_key"])

    op.create_table(
        "candidate_opportunity_watchlists",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("watchlist_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("query_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "watchlist_key", name="uq_opp_watchlist_key"),
    )
    op.create_index("ix_opp_watchlists_candidate_id", "candidate_opportunity_watchlists", ["candidate_id"])

    op.create_table(
        "candidate_opportunity_watchlist_hits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("watchlist_id", sa.Integer(), sa.ForeignKey("candidate_opportunity_watchlists.id", ondelete="CASCADE"), nullable=False),
        sa.Column("normalized_opportunity_id", sa.Integer(), sa.ForeignKey("candidate_normalized_opportunities.id", ondelete="CASCADE"), nullable=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("signal_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("seen_at", sa.DateTime(), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("watchlist_id", "job_id", name="uq_watchlist_job_hit"),
    )
    op.create_index("ix_opp_watch_hits_candidate_id", "candidate_opportunity_watchlist_hits", ["candidate_id"])

    op.create_table(
        "candidate_saved_searches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("search_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("query_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("notify", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "search_key", name="uq_saved_search_key"),
    )
    op.create_index("ix_saved_searches_candidate_id", "candidate_saved_searches", ["candidate_id"])

    op.create_table(
        "candidate_opportunity_comparisons",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("comparison_key", sa.String(length=160), nullable=False),
        sa.Column("opportunity_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "comparison_key", name="uq_opp_comparison_key"),
    )

    op.create_table(
        "candidate_discovery_prefs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prefs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("privacy_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_discovery_prefs_candidate"),
    )

    op.create_table(
        "market_signal_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("scope", sa.String(length=64), nullable=False, server_default="observed_jobs"),
        sa.Column("board_id", sa.String(length=64), nullable=True),
        sa.Column("metrics_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("wording", sa.String(length=64), nullable=False, server_default="observed_source"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("snapshot_key", name="uq_market_signal_snapshot_key"),
    )

    op.create_table(
        "opportunity_refresh_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True),
        sa.Column("job_key", sa.String(length=160), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_opp_refresh_idem"),
    )

    op.create_table(
        "opportunity_ingestion_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("policy_decision", sa.String(length=64), nullable=False, server_default="allowed"),
        sa.Column("detail_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "candidate_opportunity_audits",
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
    op.create_index("ix_opp_audits_candidate_id", "candidate_opportunity_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_opp_audits_candidate_id", table_name="candidate_opportunity_audits")
    op.drop_table("candidate_opportunity_audits")
    op.drop_table("opportunity_ingestion_audits")
    op.drop_table("opportunity_refresh_jobs")
    op.drop_table("market_signal_snapshots")
    op.drop_table("candidate_discovery_prefs")
    op.drop_table("candidate_opportunity_comparisons")
    op.drop_index("ix_saved_searches_candidate_id", table_name="candidate_saved_searches")
    op.drop_table("candidate_saved_searches")
    op.drop_index("ix_opp_watch_hits_candidate_id", table_name="candidate_opportunity_watchlist_hits")
    op.drop_table("candidate_opportunity_watchlist_hits")
    op.drop_index("ix_opp_watchlists_candidate_id", table_name="candidate_opportunity_watchlists")
    op.drop_table("candidate_opportunity_watchlists")
    op.drop_index("ix_norm_opp_dedupe", table_name="candidate_normalized_opportunities")
    op.drop_index("ix_norm_opp_candidate_id", table_name="candidate_normalized_opportunities")
    op.drop_table("candidate_normalized_opportunities")
    op.drop_table("opportunity_sources")
