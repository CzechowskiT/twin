"""Cache encrypted access tokens + expiry on calendar provider rows."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "052_calendar_access_token_cache"
down_revision: Union[str, None] = "051_company_role_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("user_google_calendar", "user_microsoft_calendar"):
        op.add_column(table, sa.Column("access_token_encrypted", sa.Text(), nullable=True))
        op.add_column(table, sa.Column("access_token_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    for table in ("user_google_calendar", "user_microsoft_calendar"):
        op.drop_column(table, "access_token_expires_at")
        op.drop_column(table, "access_token_encrypted")
