"""Adaptive Career Intelligence — memory, prefs, timeline, health, learning loop.

Revision ID: 108_adaptive_career_intelligence
Revises: 107_career_copilot_2
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "108_adaptive_career_intelligence"
down_revision: Union[str, None] = "107_career_copilot_2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_copilot_memories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("memory_key", sa.String(length=128), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="event"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="copilot"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("superseded_by_id", sa.Integer(), nullable=True),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "memory_key", "version", name="uq_copilot_memory_ver"),
    )
    op.create_index(
        "ix_candidate_copilot_memories_candidate_id", "candidate_copilot_memories", ["candidate_id"]
    )
    op.create_index("ix_candidate_copilot_memories_kind", "candidate_copilot_memories", ["kind"])

    op.create_table(
        "candidate_copilot_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pref_key", sa.String(length=64), nullable=False),
        sa.Column("value_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("editable", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("user_override", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "pref_key", name="uq_copilot_pref_key"),
    )
    op.create_index(
        "ix_candidate_copilot_preferences_candidate_id",
        "candidate_copilot_preferences",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_career_timeline_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_timeline_events_candidate_id",
        "candidate_career_timeline_events",
        ["candidate_id"],
    )
    op.create_index(
        "ix_candidate_career_timeline_events_occurred_at",
        "candidate_career_timeline_events",
        ["occurred_at"],
    )

    op.create_table(
        "candidate_skill_evolution",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("skill", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="unknown"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("next_exercise", sa.String(length=300), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "skill", name="uq_skill_evolution_skill"),
    )
    op.create_index(
        "ix_candidate_skill_evolution_candidate_id", "candidate_skill_evolution", ["candidate_id"]
    )

    op.create_table(
        "candidate_career_health_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("overall_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("dimensions_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("explanations_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_health_snapshots_candidate_id",
        "candidate_career_health_snapshots",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_learning_loop_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("milestone_ref", sa.String(length=128), nullable=True),
        sa.Column("useful", sa.Boolean(), nullable=True),
        sa.Column("prediction_correct", sa.Boolean(), nullable=True),
        sa.Column("surprise", sa.Text(), nullable=True),
        sa.Column("improve_reasoning", sa.Text(), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_learning_loop_entries_candidate_id",
        "candidate_learning_loop_entries",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_career_scenarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scenario_key", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("comparison_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("claims_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("ranking_explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_scenarios_candidate_id", "candidate_career_scenarios", ["candidate_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_career_scenarios_candidate_id", table_name="candidate_career_scenarios")
    op.drop_table("candidate_career_scenarios")
    op.drop_index(
        "ix_candidate_learning_loop_entries_candidate_id",
        table_name="candidate_learning_loop_entries",
    )
    op.drop_table("candidate_learning_loop_entries")
    op.drop_index(
        "ix_candidate_career_health_snapshots_candidate_id",
        table_name="candidate_career_health_snapshots",
    )
    op.drop_table("candidate_career_health_snapshots")
    op.drop_index("ix_candidate_skill_evolution_candidate_id", table_name="candidate_skill_evolution")
    op.drop_table("candidate_skill_evolution")
    op.drop_index(
        "ix_candidate_career_timeline_events_occurred_at",
        table_name="candidate_career_timeline_events",
    )
    op.drop_index(
        "ix_candidate_career_timeline_events_candidate_id",
        table_name="candidate_career_timeline_events",
    )
    op.drop_table("candidate_career_timeline_events")
    op.drop_index(
        "ix_candidate_copilot_preferences_candidate_id", table_name="candidate_copilot_preferences"
    )
    op.drop_table("candidate_copilot_preferences")
    op.drop_index("ix_candidate_copilot_memories_kind", table_name="candidate_copilot_memories")
    op.drop_index("ix_candidate_copilot_memories_candidate_id", table_name="candidate_copilot_memories")
    op.drop_table("candidate_copilot_memories")
