"""Account referral edges, payout ledger, Stripe subscription invoice counter."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018_account_referral_program"
down_revision: Union[str, None] = "017_linkedin_viral_incentive"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "subscription_invoice_payment_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )

    op.create_table(
        "account_referrals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("referrer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ref_code_used", sa.String(length=32), nullable=True),
        sa.Column("utm_source", sa.String(length=120), nullable=True),
        sa.Column("utm_medium", sa.String(length=120), nullable=True),
        sa.Column("utm_campaign", sa.String(length=120), nullable=True),
        sa.Column("utm_content", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("referred_user_id", name="uq_account_referrals_referred_user_id"),
    )
    op.create_index("ix_account_referrals_referrer_user_id", "account_referrals", ["referrer_user_id"])

    op.create_table(
        "referral_payouts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "referral_id",
            sa.Integer(),
            sa.ForeignKey("account_referrals.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("referrer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payout_type", sa.String(length=32), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_referral_payouts_referrer_user_id", "referral_payouts", ["referrer_user_id"])
    op.create_index("ix_referral_payouts_referral_id", "referral_payouts", ["referral_id"])


def downgrade() -> None:
    op.drop_index("ix_referral_payouts_referral_id", table_name="referral_payouts")
    op.drop_index("ix_referral_payouts_referrer_user_id", table_name="referral_payouts")
    op.drop_table("referral_payouts")
    op.drop_index("ix_account_referrals_referrer_user_id", table_name="account_referrals")
    op.drop_table("account_referrals")
    op.drop_column("users", "subscription_invoice_payment_count")
