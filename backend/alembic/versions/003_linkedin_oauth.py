"""LinkedIn OAuth fields on users."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_linkedin_oauth"
down_revision: Union[str, None] = "002_add_cv_text"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("linkedin_id", sa.String(64), nullable=True))
    op.create_index("ix_users_linkedin_id", "users", ["linkedin_id"], unique=True)
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=True)


def downgrade() -> None:
    op.alter_column("users", "hashed_password", existing_type=sa.String(255), nullable=False)
    op.drop_index("ix_users_linkedin_id", table_name="users")
    op.drop_column("users", "linkedin_id")
