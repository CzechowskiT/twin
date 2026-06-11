"""Optional recruiter pipeline stage (ATS-lite; separate from candidate Application.status)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "053_recruiter_pipeline_status"
down_revision: Union[str, None] = "052_recruiter_audit_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("recruiter_pipeline_status", sa.String(32), nullable=True),
    )
    op.create_index(
        "ix_applications_recruiter_pipeline_status",
        "applications",
        ["recruiter_pipeline_status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_applications_recruiter_pipeline_status", table_name="applications")
    op.drop_column("applications", "recruiter_pipeline_status")
