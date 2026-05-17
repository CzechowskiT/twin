"""Recruiter / process feedback and structured learning insights per application."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_app_recruiter_feedback"
down_revision: Union[str, None] = "011_extended_consents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("recruiter_feedback_raw", sa.Text(), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("feedback_insights_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "feedback_insights_json")
    op.drop_column("applications", "recruiter_feedback_raw")
