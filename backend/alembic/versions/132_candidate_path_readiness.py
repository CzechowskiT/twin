"""Epic 2.16 — minimal path selection session metadata.

Revision ID: 132_candidate_path_readiness
Revises: 131_candidate_data_trust

Does not touch canary/invite/enrollment/designation tables.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "132_candidate_path_readiness"
down_revision: Union[str, None] = "131_candidate_data_trust"
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
    if _has_table("candidate_path_readiness_sessions"):
        return
    op.create_table(
        "candidate_path_readiness_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("session_key", sa.String(length=64), nullable=False),
        sa.Column("path_kind", sa.String(length=64), nullable=False),
        sa.Column("object_kind", sa.String(length=32), nullable=True),
        sa.Column("object_ref", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("readiness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("schema_version", sa.String(length=48), nullable=False, server_default="twin.candidate_path_readiness/v1"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("first_value_satisfied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("cleared_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("candidate_id", "session_key", name="uq_path_readiness_session_key"),
    )
    op.create_index(
        "ix_path_readiness_candidate",
        "candidate_path_readiness_sessions",
        ["candidate_id"],
    )
    op.create_index(
        "ix_path_readiness_status",
        "candidate_path_readiness_sessions",
        ["status"],
    )


def downgrade() -> None:
    if _has_table("candidate_path_readiness_sessions"):
        op.drop_table("candidate_path_readiness_sessions")
