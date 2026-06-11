"""Add role_status and work_mode for company-scoped internal roles."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "051_company_role_fields"
down_revision: Union[str, None] = "050_stripe_webhook_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("role_status", sa.String(length=16), nullable=True, server_default="draft"),
    )
    op.add_column("jobs", sa.Column("work_mode", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "work_mode")
    op.drop_column("jobs", "role_status")
