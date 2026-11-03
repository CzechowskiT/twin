"""Rename support case severity_opt_in typo to diagnostic_opt_in.

Revision ID: 126_fix_support_diagnostic_opt_in
Revises: 125_pilot_operations_support_feedback
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "126_fix_support_diagnostic_opt_in"
down_revision: Union[str, None] = "125_pilot_operations_support_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    cols = {
        r[0]
        for r in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'candidate_support_cases'"
            )
        ).fetchall()
    }
    if "severity_opt_in" in cols and "diagnostic_opt_in" not in cols:
        op.alter_column(
            "candidate_support_cases",
            "severity_opt_in",
            new_column_name="diagnostic_opt_in",
            existing_type=sa.Boolean(),
            existing_nullable=False,
        )
    elif "diagnostic_opt_in" not in cols:
        op.add_column(
            "candidate_support_cases",
            sa.Column(
                "diagnostic_opt_in",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )


def downgrade() -> None:
    conn = op.get_bind()
    cols = {
        r[0]
        for r in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'candidate_support_cases'"
            )
        ).fetchall()
    }
    if "diagnostic_opt_in" in cols and "severity_opt_in" not in cols:
        op.alter_column(
            "candidate_support_cases",
            "diagnostic_opt_in",
            new_column_name="severity_opt_in",
            existing_type=sa.Boolean(),
            existing_nullable=False,
        )
