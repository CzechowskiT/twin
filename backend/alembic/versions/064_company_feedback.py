"""Company feedback persistence (064)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "064_company_feedback"
down_revision: Union[str, None] = "063_review_queue"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "company_feedback_items"):
        return
    op.create_table(
        "company_feedback_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_ref", sa.String(length=64), nullable=False),
        sa.Column("role_ref", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("rating_preview", sa.String(length=16), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("company_slug", sa.String(length=80), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("company_feedback_items")
