"""Search Outcome Intelligence — funnel learning and strategy calibration.

Revision ID: 119_search_outcome_intelligence
Revises: 118_career_market_radar_search_strategy
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "119_search_outcome_intelligence"
down_revision: Union[str, None] = "118_career_market_radar_search_strategy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_search_outcome_linkages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("linkage_key", sa.String(length=160), nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("thesis_id", sa.Integer(), nullable=True),
        sa.Column("opportunity_ref_id", sa.Integer(), nullable=True),
        sa.Column("saved_search_ref_id", sa.Integer(), nullable=True),
        sa.Column("watchlist_ref_id", sa.Integer(), nullable=True),
        sa.Column("source_key", sa.String(length=64), nullable=True),
        sa.Column("experiment_id", sa.Integer(), nullable=True),
        sa.Column("cycle_id", sa.Integer(), nullable=True),
        sa.Column("studio_ref_id", sa.Integer(), nullable=True),
        sa.Column("interview_ref_id", sa.Integer(), nullable=True),
        sa.Column("outcome_ref_id", sa.Integer(), nullable=True),
        sa.Column("stage", sa.String(length=64), nullable=False, server_default="UNKNOWN"),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="UNKNOWN"),
        sa.Column("refs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "linkage_key", name="uq_search_outcome_linkage_key"),
    )
    op.create_index("ix_search_outcome_linkages_candidate_id", "candidate_search_outcome_linkages", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("linkage_id", sa.Integer(), sa.ForeignKey("candidate_search_outcome_linkages.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_key", sa.String(length=160), nullable=False),
        sa.Column("from_stage", sa.String(length=64), nullable=True),
        sa.Column("to_stage", sa.String(length=64), nullable=False),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="CANDIDATE_DECLARED"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("silent_upgrade", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "event_key", name="uq_search_outcome_event_key"),
    )
    op.create_index("ix_search_outcome_events_candidate_id", "candidate_search_outcome_events", ["candidate_id"])

    op.create_table(
        "candidate_search_funnel_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("snapshot_key", sa.String(length=160), nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("counts_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("ratios_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("denominators_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("time_to_stage_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("unknowns_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("benchmark_json", sa.Text(), nullable=False, server_default='{"status":"NOT_PROVIDED","fabricated":false}'),
        sa.Column("wording", sa.String(length=64), nullable=False, server_default="candidate_specific"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("computed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "snapshot_key", name="uq_search_funnel_snapshot_key"),
    )
    op.create_index("ix_search_funnel_snapshots_candidate_id", "candidate_search_funnel_snapshots", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_attributions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("attribution_key", sa.String(length=160), nullable=False),
        sa.Column("component_type", sa.String(length=64), nullable=False),
        sa.Column("component_ref_id", sa.Integer(), nullable=True),
        sa.Column("summary_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("causality_claim", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("conflicts_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "attribution_key", name="uq_search_outcome_attr_key"),
    )
    op.create_index("ix_search_outcome_attrs_candidate_id", "candidate_search_outcome_attributions", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_calibrations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("calibration_key", sa.String(length=160), nullable=False),
        sa.Column("strategy_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("before_weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("preview_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("impact_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("canonical_proposal_id", sa.Integer(), nullable=True),
        sa.Column("reverted_from_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "calibration_key", name="uq_search_outcome_cal_key"),
    )
    op.create_index("ix_search_outcome_cals_candidate_id", "candidate_search_outcome_calibrations", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feedback_key", sa.String(length=160), nullable=False),
        sa.Column("linkage_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="usefulness"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_offer", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_RECOLLECTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "feedback_key", name="uq_search_outcome_fb_key"),
    )
    op.create_index("ix_search_outcome_fb_candidate_id", "candidate_search_outcome_feedback", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("review_key", sa.String(length=160), nullable=False),
        sa.Column("cadence", sa.String(length=32), nullable=False, server_default="weekly"),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "review_key", name="uq_search_outcome_rev_key"),
    )
    op.create_index("ix_search_outcome_rev_candidate_id", "candidate_search_outcome_reviews", ["candidate_id"])

    op.create_table(
        "candidate_search_outcome_audits",
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
    op.create_index("ix_search_outcome_audits_candidate_id", "candidate_search_outcome_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_search_outcome_audits")
    op.drop_table("candidate_search_outcome_reviews")
    op.drop_table("candidate_search_outcome_feedback")
    op.drop_table("candidate_search_outcome_calibrations")
    op.drop_table("candidate_search_outcome_attributions")
    op.drop_table("candidate_search_funnel_snapshots")
    op.drop_table("candidate_search_outcome_events")
    op.drop_table("candidate_search_outcome_linkages")
