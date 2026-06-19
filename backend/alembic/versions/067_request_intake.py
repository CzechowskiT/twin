"""Request intake append queue (067)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "067_request_intake"
down_revision: Union[str, None] = "066_export_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "request_intake_items"):
        return
    op.create_table(
        "request_intake_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("request_type", sa.String(length=64), nullable=False),
        sa.Column("subject_ref", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("candidate_ref", sa.String(length=64), nullable=True),
        sa.Column("company_slug", sa.String(length=80), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("request_intake_items")
