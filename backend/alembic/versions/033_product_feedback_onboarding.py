"""Product feedback, onboarding completion, and lifecycle email markers."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "033_product_feedback_onboarding"
down_revision: Union[str, None] = "032_interview_reminder_sent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("welcome_email_sent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("first_match_email_sent_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "product_feedback",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("page_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_product_feedback_user_id", "product_feedback", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_product_feedback_user_id", table_name="product_feedback")
    op.drop_table("product_feedback")
    op.drop_column("users", "first_match_email_sent_at")
    op.drop_column("users", "welcome_email_sent_at")
    op.drop_column("users", "onboarding_completed_at")
