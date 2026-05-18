"""Auto-apply tailored PDF persisted to S3 (optional)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "028_application_auto_apply_package_s3"
down_revision: Union[str, None] = "027_application_external_ats"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("auto_apply_package_s3_key", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("auto_apply_package_uploaded_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "auto_apply_package_uploaded_at")
    op.drop_column("applications", "auto_apply_package_s3_key")
