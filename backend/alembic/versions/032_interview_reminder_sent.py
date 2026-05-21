"""Track interview reminder emails (idempotent beat sweep)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "032_interview_reminder_sent"
down_revision: Union[str, None] = "031_microsoft_calendar_webcal"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "scheduled_interviews",
        sa.Column("reminder_email_sent_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("scheduled_interviews", "reminder_email_sent_at")
