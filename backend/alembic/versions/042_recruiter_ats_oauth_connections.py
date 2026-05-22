"""Recruiter ATS OAuth connection placeholders (Greenhouse / Lever)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "042_recruiter_ats_oauth_connections"
down_revision: Union[str, None] = "041_referral_cash_out_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recruiter_ats_oauth_connections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("oauth_state", sa.String(length=64), nullable=True),
        sa.Column("external_account_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_recruiter_ats_oauth_user_provider",
        "recruiter_ats_oauth_connections",
        ["user_id", "provider"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_ats_oauth_user_provider", table_name="recruiter_ats_oauth_connections")
    op.drop_table("recruiter_ats_oauth_connections")
