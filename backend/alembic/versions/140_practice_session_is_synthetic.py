"""Add is_synthetic to candidate_interview_practice_sessions.

Revision ID: 140_practice_session_is_synthetic
Revises: 139_candidate_interview_practice

Separates synthetic provenance from kpi_excluded / metrics exclusion.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "140_practice_session_is_synthetic"
down_revision: Union[str, None] = "139_candidate_interview_practice"
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
    if not _has_column("candidate_interview_practice_sessions", "is_synthetic"):
        op.add_column(
            "candidate_interview_practice_sessions",
            sa.Column("is_synthetic", sa.Boolean(), server_default=sa.false(), nullable=False),
        )
    if not _has_column("candidate_interview_practice_sessions", "exercise_version"):
        op.add_column(
            "candidate_interview_practice_sessions",
            sa.Column("exercise_version", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("candidate_interview_practice_sessions", "exercise_version"):
        op.drop_column("candidate_interview_practice_sessions", "exercise_version")
    if _has_column("candidate_interview_practice_sessions", "is_synthetic"):
        op.drop_column("candidate_interview_practice_sessions", "is_synthetic")
