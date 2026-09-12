"""Add provider_execution_json to practice evaluations.

Revision ID: 141_practice_eval_provider_execution
Revises: 140_practice_session_is_synthetic

Server-owned execution metadata at the adapter boundary.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "141_practice_eval_provider_execution"
down_revision: Union[str, None] = "140_practice_session_is_synthetic"
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
    if not _has_column("candidate_interview_practice_evaluations", "provider_execution_json"):
        op.add_column(
            "candidate_interview_practice_evaluations",
            sa.Column("provider_execution_json", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    if _has_column("candidate_interview_practice_evaluations", "provider_execution_json"):
        op.drop_column("candidate_interview_practice_evaluations", "provider_execution_json")
