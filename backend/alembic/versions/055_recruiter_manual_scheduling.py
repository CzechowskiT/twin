"""Recruiter manual interview scheduling fields on applications (no calendar sync)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "055_recruiter_manual_scheduling"
down_revision: Union[str, None] = "054_recruiter_pipeline_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("applications")}
    additions = (
        ("recruiter_scheduling_status", sa.Column("recruiter_scheduling_status", sa.String(32), nullable=True)),
        ("recruiter_manual_slot_at", sa.Column("recruiter_manual_slot_at", sa.DateTime(), nullable=True)),
        (
            "recruiter_manual_slot_duration_minutes",
            sa.Column("recruiter_manual_slot_duration_minutes", sa.Integer(), nullable=True),
        ),
        (
            "recruiter_manual_meeting_link",
            sa.Column("recruiter_manual_meeting_link", sa.String(2000), nullable=True),
        ),
    )
    for name, column in additions:
        if name not in cols:
            op.add_column("applications", column)


def downgrade() -> None:
    op.drop_column("applications", "recruiter_manual_meeting_link")
    op.drop_column("applications", "recruiter_manual_slot_duration_minutes")
    op.drop_column("applications", "recruiter_manual_slot_at")
    op.drop_column("applications", "recruiter_scheduling_status")
