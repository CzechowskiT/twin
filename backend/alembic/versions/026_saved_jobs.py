"""Saved jobs (bookmarks) per candidate."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026_saved_jobs"
down_revision: Union[str, None] = "025_user_profile_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saved_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_saved_jobs"),
    )
    op.create_index("ix_saved_jobs_candidate_id", "saved_jobs", ["candidate_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_saved_jobs_candidate_id", table_name="saved_jobs")
    op.drop_table("saved_jobs")
