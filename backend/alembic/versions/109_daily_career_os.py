"""Daily Career Operating System — briefs, inbox, watchlist, cadence, privacy.

Revision ID: 109_daily_career_os
Revises: 108_adaptive_career_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "109_daily_career_os"
down_revision: Union[str, None] = "108_adaptive_career_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_daily_briefs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("brief_date", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("headline", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("context_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("snoozed_until", sa.DateTime(), nullable=True),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "brief_date", name="uq_daily_brief_date"),
    )
    op.create_index("ix_candidate_daily_briefs_candidate_id", "candidate_daily_briefs", ["candidate_id"])

    op.create_table(
        "candidate_career_change_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("change_kind", sa.String(length=32), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_key", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_change_events_candidate_id",
        "candidate_career_change_events",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_career_inbox_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item_key", sa.String(length=128), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="NEW"),
        sa.Column("priority_score", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("priority_explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("deep_link", sa.String(length=300), nullable=True),
        sa.Column("effort", sa.String(length=32), nullable=True),
        sa.Column("completion_criterion", sa.String(length=300), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("snoozed_until", sa.DateTime(), nullable=True),
        sa.Column("last_surfaced_at", sa.DateTime(), nullable=True),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "item_key", name="uq_career_inbox_item_key"),
    )
    op.create_index(
        "ix_candidate_career_inbox_items_candidate_id",
        "candidate_career_inbox_items",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_career_inbox_items_status", "candidate_career_inbox_items", ["status"]
    )

    op.create_table(
        "candidate_career_inbox_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("inbox_item_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_inbox_audits_candidate_id",
        "candidate_career_inbox_audits",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_career_reminders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("reminder_key", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="in_product"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="scheduled"),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "idempotency_key", name="uq_career_reminder_idem"),
    )
    op.create_index(
        "ix_candidate_career_reminders_candidate_id", "candidate_career_reminders", ["candidate_id"]
    )

    op.create_table(
        "candidate_opportunity_watchlist",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("watch_key", sa.String(length=128), nullable=False),
        sa.Column("watch_type", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("criteria_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("last_snapshot_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("freshness", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "watch_key", name="uq_watchlist_key"),
    )
    op.create_index(
        "ix_candidate_opportunity_watchlist_candidate_id",
        "candidate_opportunity_watchlist",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_daily_cadence",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("quiet_hours_start", sa.Integer(), nullable=True),
        sa.Column("quiet_hours_end", sa.Integer(), nullable=True),
        sa.Column("intensity", sa.String(length=32), nullable=False, server_default="normal"),
        sa.Column("quiet_mode", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("paused_modules_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("daily_cap", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("cooldown_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_daily_cadence_candidate"),
    )

    op.create_table(
        "candidate_daily_privacy_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("learning_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("briefs_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("email_reminders_opt_in", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_daily_privacy_candidate"),
    )

    op.create_table(
        "candidate_recommendation_weights",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("weights_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="baseline"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "version", name="uq_rec_weights_ver"),
    )
    op.create_index(
        "ix_candidate_recommendation_weights_candidate_id",
        "candidate_recommendation_weights",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_momentum_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dimensions_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_momentum_snapshots_candidate_id",
        "candidate_momentum_snapshots",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_progress_reviews",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("period", sa.String(length=16), nullable=False),
        sa.Column("summary_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("proposed_changes_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("user_approved", sa.Boolean(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_progress_reviews_candidate_id",
        "candidate_progress_reviews",
        ["candidate_id"],
    )


def downgrade() -> None:
    for table, idx in (
        ("candidate_progress_reviews", "ix_candidate_progress_reviews_candidate_id"),
        ("candidate_momentum_snapshots", "ix_candidate_momentum_snapshots_candidate_id"),
        ("candidate_recommendation_weights", "ix_candidate_recommendation_weights_candidate_id"),
        ("candidate_daily_privacy_settings", None),
        ("candidate_daily_cadence", None),
        ("candidate_opportunity_watchlist", "ix_candidate_opportunity_watchlist_candidate_id"),
        ("candidate_career_reminders", "ix_candidate_career_reminders_candidate_id"),
        ("candidate_career_inbox_audits", "ix_candidate_career_inbox_audits_candidate_id"),
        ("candidate_career_inbox_items", "ix_candidate_career_inbox_items_candidate_id"),
        ("candidate_career_change_events", "ix_candidate_career_change_events_candidate_id"),
        ("candidate_daily_briefs", "ix_candidate_daily_briefs_candidate_id"),
    ):
        if idx:
            op.drop_index(idx, table_name=table)
        if table == "candidate_career_inbox_items":
            op.drop_index("ix_candidate_career_inbox_items_status", table_name=table)
        op.drop_table(table)
