"""Candidate role status persistence (062)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "062_candidate_role_status"
down_revision: Union[str, None] = "061_work_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "candidate_role_statuses"):
        return
    op.create_table(
        "candidate_role_statuses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_ref", sa.String(length=64), nullable=False),
        sa.Column("role_ref", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_role_statuses_candidate_ref", "candidate_role_statuses", ["candidate_ref"])
    op.create_index("ix_candidate_role_statuses_role_ref", "candidate_role_statuses", ["role_ref"])


def downgrade() -> None:
    op.drop_index("ix_candidate_role_statuses_role_ref", table_name="candidate_role_statuses")
    op.drop_index("ix_candidate_role_statuses_candidate_ref", table_name="candidate_role_statuses")
    op.drop_table("candidate_role_statuses")
