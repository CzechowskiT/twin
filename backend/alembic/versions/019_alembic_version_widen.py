"""Widen alembic_version.version_num so long revision ids cannot truncate on PostgreSQL."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_alembic_ver_widen"
down_revision: Union[str, None] = "018_account_referral_program"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(128)"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(32)"))
