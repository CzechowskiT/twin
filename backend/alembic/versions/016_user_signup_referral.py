"""Optional signup referral note and resolved referrer user."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_user_signup_referral"
down_revision: Union[str, None] = "015_jobs_val_scraped_at_idx"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("signup_referred_by_note", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("signup_referrer_user_id", sa.Integer(), nullable=True))
    op.create_index(
        "ix_users_signup_referrer_user_id",
        "users",
        ["signup_referrer_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_users_signup_referrer_user_id_users",
        "users",
        "users",
        ["signup_referrer_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_users_signup_referrer_user_id_users", "users", type_="foreignkey")
    op.drop_index("ix_users_signup_referrer_user_id", table_name="users")
    op.drop_column("users", "signup_referrer_user_id")
    op.drop_column("users", "signup_referred_by_note")
