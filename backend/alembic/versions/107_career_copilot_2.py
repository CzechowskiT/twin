"""Career Copilot 2.0 — persistent graph, directions, goals, actions, memory.

Revision ID: 107_career_copilot_2
Revises: 106_candidate_first_phase2_hardening
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "107_career_copilot_2"
down_revision: Union[str, None] = "106_candidate_first_phase2_hardening"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_career_graphs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("graph_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="rules_v1"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_candidate_career_graphs_candidate_id"),
    )
    op.create_index("ix_candidate_career_graphs_candidate_id", "candidate_career_graphs", ["candidate_id"])

    op.create_table(
        "candidate_career_directions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("path_key", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="suggested"),
        sa.Column("probability", sa.Float(), nullable=True),
        sa.Column("effort", sa.String(length=32), nullable=True),
        sa.Column("risk", sa.String(length=32), nullable=True),
        sa.Column("timeline_months", sa.Integer(), nullable=True),
        sa.Column("market_demand", sa.String(length=32), nullable=True),
        sa.Column("salary_trend", sa.String(length=32), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claims_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("is_selected", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("rejected_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "path_key", name="uq_career_direction_path_key"),
    )
    op.create_index(
        "ix_candidate_career_directions_candidate_id", "candidate_career_directions", ["candidate_id"]
    )

    op.create_table(
        "candidate_career_goals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("goal_type", sa.String(length=64), nullable=False, server_default="career"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("target_role", sa.String(length=200), nullable=True),
        sa.Column("target_date", sa.DateTime(), nullable=True),
        sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("history_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("paused_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_career_goals_candidate_id", "candidate_career_goals", ["candidate_id"])
    op.create_index("ix_candidate_career_goals_status", "candidate_career_goals", ["status"])

    op.create_table(
        "candidate_career_actions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("goal_id", sa.Integer(), sa.ForeignKey("candidate_career_goals.id", ondelete="SET NULL"), nullable=True),
        sa.Column("horizon", sa.String(length=32), nullable=False, server_default="month1"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="planned"),
        sa.Column("effort", sa.String(length=32), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("dependency", sa.String(length=200), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("impact", sa.String(length=64), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="medium"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="copilot"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_career_actions_candidate_id", "candidate_career_actions", ["candidate_id"])
    op.create_index("ix_candidate_career_actions_horizon", "candidate_career_actions", ["horizon"])

    op.create_table(
        "candidate_copilot_recommendations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rec_key", sa.String(length=128), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False, server_default="direction"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="suggested"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("evidence_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("rejected_at", sa.DateTime(), nullable=True),
        sa.Column("ignored_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "rec_key", name="uq_copilot_rec_key"),
    )
    op.create_index(
        "ix_candidate_copilot_recommendations_candidate_id",
        "candidate_copilot_recommendations",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_career_decisions",
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
        sa.Column("user_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_decisions_candidate_id", "candidate_career_decisions", ["candidate_id"]
    )

    op.create_table(
        "candidate_career_reflections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("milestone_ref", sa.String(length=128), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_career_reflections_candidate_id",
        "candidate_career_reflections",
        ["candidate_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_career_reflections_candidate_id", table_name="candidate_career_reflections")
    op.drop_table("candidate_career_reflections")
    op.drop_index("ix_candidate_career_decisions_candidate_id", table_name="candidate_career_decisions")
    op.drop_table("candidate_career_decisions")
    op.drop_index(
        "ix_candidate_copilot_recommendations_candidate_id",
        table_name="candidate_copilot_recommendations",
    )
    op.drop_table("candidate_copilot_recommendations")
    op.drop_index("ix_candidate_career_actions_horizon", table_name="candidate_career_actions")
    op.drop_index("ix_candidate_career_actions_candidate_id", table_name="candidate_career_actions")
    op.drop_table("candidate_career_actions")
    op.drop_index("ix_candidate_career_goals_status", table_name="candidate_career_goals")
    op.drop_index("ix_candidate_career_goals_candidate_id", table_name="candidate_career_goals")
    op.drop_table("candidate_career_goals")
    op.drop_index("ix_candidate_career_directions_candidate_id", table_name="candidate_career_directions")
    op.drop_table("candidate_career_directions")
    op.drop_index("ix_candidate_career_graphs_candidate_id", table_name="candidate_career_graphs")
    op.drop_table("candidate_career_graphs")
