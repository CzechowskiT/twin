"""Application external ATS identifiers (webhook correlation)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "027_application_external_ats"
down_revision: Union[str, None] = "026_saved_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("external_ats_id", sa.String(length=255), nullable=True))
    op.add_column("applications", sa.Column("external_ats_provider", sa.String(length=32), nullable=True))
    op.create_index("ix_applications_external_ats_id", "applications", ["external_ats_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_applications_external_ats_id", table_name="applications")
    op.drop_column("applications", "external_ats_provider")
    op.drop_column("applications", "external_ats_id")
