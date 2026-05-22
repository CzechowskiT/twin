"""Referral cash-out requests (ops fulfillment queue)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "041_referral_cash_out_requests"
down_revision: Union[str, None] = "040_career_assistant_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "referral_cash_out_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("payout_method", sa.String(length=32), nullable=False),
        sa.Column("payout_details", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'requested'")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_referral_cash_out_requests_user_id",
        "referral_cash_out_requests",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_referral_cash_out_requests_user_id", table_name="referral_cash_out_requests")
    op.drop_table("referral_cash_out_requests")
