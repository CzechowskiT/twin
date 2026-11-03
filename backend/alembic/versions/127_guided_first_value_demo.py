"""Guided first value + isolated demo session tables (Epic 2.11).

Revision ID: 127_guided_first_value_demo
Revises: 126_fix_support_diagnostic_opt_in
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "127_guided_first_value_demo"
down_revision: Union[str, None] = "126_fix_support_diagnostic_opt_in"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :n LIMIT 1"
        ),
        {"n": name},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    if not _has_table("candidate_guided_first_value"):
        op.create_table(
            "candidate_guided_first_value",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="NOT_STARTED"),
            sa.Column("entry_choice", sa.String(length=48), nullable=True),
            sa.Column("starter_path", sa.String(length=64), nullable=True),
            sa.Column("progress_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("demo_first_value_seen", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("real_first_value_reached", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("paused_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", name="uq_guided_fv_candidate"),
        )
        op.create_index("ix_guided_fv_user", "candidate_guided_first_value", ["user_id"])
        op.create_index("ix_guided_fv_state", "candidate_guided_first_value", ["state"])

    if not _has_table("candidate_isolated_demo_sessions"):
        op.create_table(
            "candidate_isolated_demo_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("session_key", sa.String(length=64), nullable=False),
            sa.Column("scenario_version", sa.String(length=32), nullable=False, server_default="demo_scenario_v1"),
            sa.Column("mode", sa.String(length=16), nullable=False, server_default="DEMO"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
            sa.Column("scenario_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("canonical_writes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("external_calls", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("exited_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "session_key", name="uq_demo_session_key"),
        )
        op.create_index("ix_demo_session_user", "candidate_isolated_demo_sessions", ["user_id"])
        op.create_index("ix_demo_session_status", "candidate_isolated_demo_sessions", ["status"])


def downgrade() -> None:
    if _has_table("candidate_isolated_demo_sessions"):
        op.drop_table("candidate_isolated_demo_sessions")
    if _has_table("candidate_guided_first_value"):
        op.drop_table("candidate_guided_first_value")
