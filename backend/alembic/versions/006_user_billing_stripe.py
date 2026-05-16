"""Stripe billing columns and plan tier on users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_user_billing_stripe"
down_revision: Union[str, None] = "005_oauth_accounts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan_tier", sa.String(length=32), server_default="free", nullable=False),
    )
    op.add_column("users", sa.Column("subscription_status", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("subscription_current_period_end", sa.DateTime(), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)
    op.create_index("ix_users_stripe_subscription_id", "users", ["stripe_subscription_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_stripe_subscription_id", table_name="users")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "subscription_current_period_end")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "plan_tier")
