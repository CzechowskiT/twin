"""Optional recruiter pipeline stage (ATS-lite; separate from candidate Application.status)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "054_recruiter_pipeline_status"
down_revision: Union[str, None] = "053_recruiter_audit_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("applications")}
    if "recruiter_pipeline_status" not in cols:
        op.add_column(
            "applications",
            sa.Column("recruiter_pipeline_status", sa.String(32), nullable=True),
        )
    indexes = {idx["name"] for idx in insp.get_indexes("applications")}
    if "ix_applications_recruiter_pipeline_status" not in indexes:
        op.create_index(
            "ix_applications_recruiter_pipeline_status",
            "applications",
            ["recruiter_pipeline_status"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_applications_recruiter_pipeline_status", table_name="applications")
    op.drop_column("applications", "recruiter_pipeline_status")
