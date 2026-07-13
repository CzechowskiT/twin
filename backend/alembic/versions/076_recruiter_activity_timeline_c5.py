"""Recruiter activity timeline index (Wave C slice 5)."""

from typing import Sequence, Union

from alembic import op

revision: str = "076_recruiter_activity_timeline_c5"
down_revision: Union[str, None] = "075_recruiter_saved_views_c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_recruiter_audit_events_company_created",
        "recruiter_audit_events",
        ["company_slug", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_audit_events_company_created", table_name="recruiter_audit_events")
