"""Read-only export request records (066)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "066_export_requests"
down_revision: Union[str, None] = "065_candidate_visibility_preferences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "export_requests"):
        return
    op.create_table(
        "export_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("request_type", sa.String(length=64), nullable=False),
        sa.Column("candidate_id", sa.String(length=64), nullable=False),
        sa.Column("role_context_id", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="twin_internal"),
        sa.Column("legal_claim", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_export_requests_candidate_id", "export_requests", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_export_requests_candidate_id", table_name="export_requests")
    op.drop_table("export_requests")
