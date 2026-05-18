"""Add optional email notification preference columns on users (GDPR opt-in defaults)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "024_user_notification_email_preferences"
down_revision: Union[str, None] = "023_idempotency_auto_apply_partner_billing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "email_product_updates",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "email_interview_reminders",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.alter_column("users", "email_product_updates", server_default=None)
    op.alter_column("users", "email_interview_reminders", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "email_interview_reminders")
    op.drop_column("users", "email_product_updates")
