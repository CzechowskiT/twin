"""Acceptance Calendar — career execution planning (internal calendar of acceptance).

Revision ID: 110_acceptance_calendar
Revises: 109_daily_career_os
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "110_acceptance_calendar"
down_revision: Union[str, None] = "109_daily_career_os"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_acceptance_outcomes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("target_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_acceptance_outcomes_candidate_id",
        "candidate_acceptance_outcomes",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_time_budgets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("hours_per_week", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("hours_per_day_cap", sa.Integer(), nullable=True),
        sa.Column("protected_blocks_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="explicit_user"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_time_budget_candidate"),
    )

    op.create_table(
        "candidate_calendar_consents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("internal_calendar_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("ms_busy_read_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("google_busy_read_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ics_export_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("store_availability_blocks", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_calendar_consent_candidate"),
    )

    op.create_table(
        "candidate_calendar_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("prefs_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="user_feedback"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "version", name="uq_cal_prefs_ver"),
    )
    op.create_index(
        "ix_candidate_calendar_preferences_candidate_id",
        "candidate_calendar_preferences",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_acceptance_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item_key", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=48), nullable=False),
        sa.Column("state", sa.String(length=48), nullable=False, server_default="proposed"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("importance", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(length=64), nullable=False, server_default="internal"),
        sa.Column("source_id", sa.String(length=128), nullable=True),
        sa.Column("outcome_id", sa.Integer(), nullable=True),
        sa.Column("deep_link", sa.String(length=300), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("at_risk", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("protected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "item_key", name="uq_acceptance_item_key"),
    )
    op.create_index(
        "ix_candidate_acceptance_items_candidate_id",
        "candidate_acceptance_items",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_acceptance_items_due_at",
        "candidate_acceptance_items",
        ["due_at"],
    )

    op.create_table(
        "candidate_proposed_holds",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hold_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("why_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("alternatives_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("external_created", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "hold_key", name="uq_proposed_hold_key"),
    )
    op.create_index(
        "ix_candidate_proposed_holds_candidate_id",
        "candidate_proposed_holds",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_availability_blocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=False),
        sa.Column("busy", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="synthetic"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_availability_blocks_candidate_id",
        "candidate_availability_blocks",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_weekly_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_start", sa.String(length=10), nullable=False),
        sa.Column("strategy_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("user_approved", sa.Boolean(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "week_start", "version", name="uq_weekly_plan_ver"),
    )
    op.create_index(
        "ix_candidate_weekly_plans_candidate_id",
        "candidate_weekly_plans",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_acceptance_item_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_acceptance_item_audits_candidate_id",
        "candidate_acceptance_item_audits",
        ["candidate_id"],
    )


def downgrade() -> None:
    for table in (
        "candidate_acceptance_item_audits",
        "candidate_weekly_plans",
        "candidate_availability_blocks",
        "candidate_proposed_holds",
        "candidate_acceptance_items",
        "candidate_calendar_preferences",
        "candidate_calendar_consents",
        "candidate_time_budgets",
        "candidate_acceptance_outcomes",
    ):
        op.drop_table(table)
