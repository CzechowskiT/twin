"""Candidate visibility preferences store (065)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "065_candidate_visibility_preferences"
down_revision: Union[str, None] = "064_company_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "candidate_visibility_preferences"):
        return
    op.create_table(
        "candidate_visibility_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("profile_visibility", sa.String(length=32), nullable=False),
        sa.Column("cv_visibility", sa.String(length=32), nullable=False),
        sa.Column("match_visibility", sa.String(length=32), nullable=False),
        sa.Column("company_visibility", sa.String(length=32), nullable=False),
        sa.Column("communication_preference", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_visibility_preferences_candidate_id", "candidate_visibility_preferences", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_candidate_visibility_preferences_candidate_id", table_name="candidate_visibility_preferences")
    op.drop_table("candidate_visibility_preferences")
