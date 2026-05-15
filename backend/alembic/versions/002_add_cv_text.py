"""Add cv_text for contextual matching."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_add_cv_text"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("candidates", sa.Column("cv_text", sa.Text(), nullable=True))
    op.add_column("candidates", sa.Column("cv_filename", sa.String(255), nullable=True))
    op.add_column("candidates", sa.Column("cv_uploaded_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "cv_uploaded_at")
    op.drop_column("candidates", "cv_filename")
    op.drop_column("candidates", "cv_text")
