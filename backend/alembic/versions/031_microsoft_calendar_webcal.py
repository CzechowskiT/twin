"""Microsoft 365 calendar OAuth + user WebCal subscribe token."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "031_microsoft_calendar_webcal"
down_revision: Union[str, None] = "030_employer_leads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_microsoft_calendar",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("refresh_token_encrypted", sa.Text(), nullable=False),
        sa.Column("microsoft_email", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.add_column("users", sa.Column("webcal_feed_token_hash", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("webcal_feed_token_expires_at", sa.DateTime(), nullable=True))
    op.create_index("ix_users_webcal_feed_token_hash", "users", ["webcal_feed_token_hash"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_webcal_feed_token_hash", table_name="users")
    op.drop_column("users", "webcal_feed_token_expires_at")
    op.drop_column("users", "webcal_feed_token_hash")
    op.drop_table("user_microsoft_calendar")
