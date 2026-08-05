"""Read-Only Calendar Intelligence — Consent Lifecycle + Continuous Planning Sync.

Revision ID: 122_read_only_calendar_sync
Revises: 121_decision_calendar_capacity_planning
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "122_read_only_calendar_sync"
down_revision: Union[str, None] = "121_decision_calendar_capacity_planning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_calendar_connections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connection_key", sa.String(length=160), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="microsoft"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="disconnected"),
        sa.Column("scopes_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("consent_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ms_busy_read_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("token_health", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("sync_cursor", sa.String(length=255), nullable=True),
        sa.Column("oauth_meta_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("health_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("user_ms_row_ref", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "connection_key", name="uq_calendar_connection_key"),
    )
    op.create_index("ix_calendar_connections_candidate_id", "candidate_calendar_connections", ["candidate_id"])

    op.create_table(
        "candidate_calendar_sync_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_key", sa.String(length=160), nullable=False),
        sa.Column("connection_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("mode", sa.String(length=32), nullable=False, server_default="synthetic"),
        sa.Column("busy_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delta_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("snapshot_id", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("idempotency_key", sa.String(length=160), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "run_key", name="uq_calendar_sync_run_key"),
    )
    op.create_index("ix_calendar_sync_runs_candidate_id", "candidate_calendar_sync_runs", ["candidate_id"])

    op.create_table(
        "candidate_calendar_busy_deltas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delta_key", sa.String(length=160), nullable=False),
        sa.Column("sync_run_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="changed"),
        sa.Column("busy_before_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("busy_after_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("added_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("removed_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("freshness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "delta_key", name="uq_calendar_busy_delta_key"),
    )
    op.create_index("ix_calendar_busy_deltas_candidate_id", "candidate_calendar_busy_deltas", ["candidate_id"])

    op.create_table(
        "candidate_calendar_recalculation_proposals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proposal_key", sa.String(length=160), nullable=False),
        sa.Column("delta_id", sa.Integer(), nullable=True),
        sa.Column("sync_run_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("affected_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("plan_before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("plan_after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("lifecycle_approval_id", sa.Integer(), nullable=True),
        sa.Column("silent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("acal_mutated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "proposal_key", name="uq_calendar_recalc_proposal_key"),
    )
    op.create_index(
        "ix_calendar_recalc_proposals_candidate_id",
        "candidate_calendar_recalculation_proposals",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_calendar_private_feeds",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("feed_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("scope_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("external_booking", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ics_is_confirmation", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="CANDIDATE_CONFIRMED"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "feed_key", name="uq_calendar_private_feed_key"),
    )
    op.create_index("ix_calendar_private_feeds_candidate_id", "candidate_calendar_private_feeds", ["candidate_id"])
    op.create_index("ix_calendar_private_feeds_token_hash", "candidate_calendar_private_feeds", ["token_hash"])

    op.create_table(
        "candidate_calendar_sync_audits",
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
    op.create_index("ix_calendar_sync_audits_candidate_id", "candidate_calendar_sync_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_calendar_sync_audits")
    op.drop_table("candidate_calendar_private_feeds")
    op.drop_table("candidate_calendar_recalculation_proposals")
    op.drop_table("candidate_calendar_busy_deltas")
    op.drop_table("candidate_calendar_sync_runs")
    op.drop_table("candidate_calendar_connections")
