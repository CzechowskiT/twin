"""Scheduled interviews synced to Google Calendar (MVP persistence)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_scheduled_interviews"
down_revision: Union[str, None] = "013_user_google_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "scheduled_interviews",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("job_title", sa.String(length=255), nullable=False),
        sa.Column("interviewer_name", sa.String(length=255), nullable=True),
        sa.Column("interviewer_email", sa.String(length=255), nullable=True),
        sa.Column("interview_start", sa.DateTime(), nullable=False),
        sa.Column("interview_end", sa.DateTime(), nullable=False),
        sa.Column("timezone", sa.String(length=50), nullable=False, server_default="UTC"),
        sa.Column("calendar_event_id", sa.String(length=255), nullable=True),
        sa.Column("calendar_provider", sa.String(length=50), nullable=False, server_default="google"),
        sa.Column("meeting_link", sa.String(length=500), nullable=True),
        sa.Column("meeting_location", sa.String(length=500), nullable=True),
        sa.Column("interview_type", sa.String(length=50), nullable=False, server_default="video"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="scheduled"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_scheduled_interviews_user_start", "scheduled_interviews", ["user_id", "interview_start"])
    op.create_index("ix_scheduled_interviews_interview_start", "scheduled_interviews", ["interview_start"])


def downgrade() -> None:
    op.drop_index("ix_scheduled_interviews_interview_start", table_name="scheduled_interviews")
    op.drop_index("ix_scheduled_interviews_user_start", table_name="scheduled_interviews")
    op.drop_table("scheduled_interviews")
