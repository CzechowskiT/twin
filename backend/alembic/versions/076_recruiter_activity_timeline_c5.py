"""Recruiter activity timeline index (Wave C slice 5)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "076_recruiter_activity_timeline_c5"
down_revision: Union[str, None] = "075_recruiter_saved_views_c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    exists = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_indexes "
            "WHERE schemaname = 'public' "
            "AND indexname = 'ix_recruiter_audit_events_company_created' "
            "LIMIT 1"
        )
    ).fetchone()
    if exists:
        return
    op.create_index(
        "ix_recruiter_audit_events_company_created",
        "recruiter_audit_events",
        ["company_slug", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_audit_events_company_created", table_name="recruiter_audit_events")
