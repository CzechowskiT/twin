"""Time-limited token for unauthenticated .ics download (calendar sharing)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "029_scheduled_interview_ics_token"
down_revision: Union[str, None] = "028_application_auto_apply_package_s3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "scheduled_interviews",
        sa.Column("ics_access_token_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "scheduled_interviews",
        sa.Column("ics_access_token_expires_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_scheduled_interviews_ics_token_hash",
        "scheduled_interviews",
        ["ics_access_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scheduled_interviews_ics_token_hash", table_name="scheduled_interviews")
    op.drop_column("scheduled_interviews", "ics_access_token_expires_at")
    op.drop_column("scheduled_interviews", "ics_access_token_hash")
