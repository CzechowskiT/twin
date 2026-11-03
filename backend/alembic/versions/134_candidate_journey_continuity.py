"""Epic 2.18 — additive Continuity columns on path readiness sessions.

Revision ID: 134_candidate_journey_continuity
Revises: 133_candidate_career_pack

Sole store remains candidate_path_readiness_sessions.
No parallel journey_checkpoints / resume_sessions table.
No canary/invite DML.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "134_candidate_journey_continuity"
down_revision: Union[str, None] = "133_candidate_career_pack"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c LIMIT 1"
        ),
        {"t": table, "c": column},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    table = "candidate_path_readiness_sessions"
    cols = [
        (
            "flow_kind",
            sa.Column(
                "flow_kind",
                sa.String(length=64),
                nullable=False,
                server_default="CANDIDATE_PATH_READINESS",
            ),
        ),
        ("owner_ref", sa.Column("owner_ref", sa.String(length=128), nullable=True)),
        ("step_key", sa.Column("step_key", sa.String(length=64), nullable=True)),
        (
            "revision",
            sa.Column("revision", sa.Integer(), nullable=False, server_default="1"),
        ),
        ("route_key", sa.Column("route_key", sa.String(length=64), nullable=True)),
        (
            "pinned",
            sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        ),
        (
            "paused",
            sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        ),
        ("expires_at", sa.Column("expires_at", sa.DateTime(), nullable=True)),
        (
            "continuity_schema",
            sa.Column(
                "continuity_schema",
                sa.String(length=64),
                nullable=False,
                server_default="twin.candidate_journey_session/v1",
            ),
        ),
        (
            "source_revision",
            sa.Column("source_revision", sa.String(length=64), nullable=True),
        ),
    ]
    for name, col in cols:
        if not _has_column(table, name):
            op.add_column(table, col)

    op.execute(
        sa.text(
            "UPDATE candidate_path_readiness_sessions "
            "SET flow_kind = 'CANDIDATE_PATH_READINESS' "
            "WHERE flow_kind IS NULL OR flow_kind = ''"
        )
    )
    op.execute(
        sa.text(
            "UPDATE candidate_path_readiness_sessions "
            "SET continuity_schema = 'twin.candidate_journey_session/v1' "
            "WHERE continuity_schema IS NULL OR continuity_schema = ''"
        )
    )
    conn = op.get_bind()
    idx = conn.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_journey_flow_candidate' LIMIT 1"
        )
    ).fetchall()
    if not idx:
        op.create_index(
            "ix_journey_flow_candidate",
            table,
            ["candidate_id", "flow_kind", "status"],
        )


def downgrade() -> None:
    table = "candidate_path_readiness_sessions"
    for name in (
        "source_revision",
        "continuity_schema",
        "expires_at",
        "paused",
        "pinned",
        "route_key",
        "revision",
        "step_key",
        "owner_ref",
        "flow_kind",
    ):
        if _has_column(table, name):
            op.drop_column(table, name)
