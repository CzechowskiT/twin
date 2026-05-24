"""Competitive job board columns on jobs (tech stack, requirements split, culture)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_job_competitive_features"
down_revision: Union[str, None] = "045_cookie_consent_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("tech_stack", sa.Text(), nullable=False, server_default="[]"))
    op.add_column("jobs", sa.Column("requirements_must_have", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("requirements_nice_to_have", sa.Text(), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("interview_process_json", sa.Text(), nullable=False, server_default="[]"),
    )
    op.add_column("jobs", sa.Column("remote_percentage", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("seniority_level", sa.String(32), nullable=True))
    op.add_column("jobs", sa.Column("culture_tags", sa.Text(), nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("jobs", "culture_tags")
    op.drop_column("jobs", "seniority_level")
    op.drop_column("jobs", "remote_percentage")
    op.drop_column("jobs", "interview_process_json")
    op.drop_column("jobs", "requirements_nice_to_have")
    op.drop_column("jobs", "requirements_must_have")
    op.drop_column("jobs", "tech_stack")
