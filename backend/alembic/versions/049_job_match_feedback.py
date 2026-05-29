"""Per-job match feedback for quality gate and reranking."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "049_job_match_feedback"
down_revision: Union[str, None] = "048_application_submission_evidence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_match_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("feedback_value", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "job_id", name="uq_job_match_feedback"),
    )
    op.create_index("ix_job_match_feedback_candidate_id", "job_match_feedback", ["candidate_id"])
    op.create_index("ix_job_match_feedback_job_id", "job_match_feedback", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_job_match_feedback_job_id", table_name="job_match_feedback")
    op.drop_index("ix_job_match_feedback_candidate_id", table_name="job_match_feedback")
    op.drop_table("job_match_feedback")
