"""Strategic vision: candidate progress + unified opportunity job fields."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_strategic_vision_features"
down_revision: Union[str, None] = "045_cookie_consent_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("xp_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date(), nullable=True),
        sa.Column("badges_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("stats_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_candidate_progress_candidate_id"),
    )
    op.create_index("ix_candidate_progress_candidate_id", "candidate_progress", ["candidate_id"])

    op.add_column(
        "jobs",
        sa.Column("opportunity_type", sa.String(length=32), nullable=False, server_default="full_time"),
    )
    op.add_column("jobs", sa.Column("project_duration_months", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("hourly_rate_min", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("hourly_rate_max", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "hourly_rate_max")
    op.drop_column("jobs", "hourly_rate_min")
    op.drop_column("jobs", "project_duration_months")
    op.drop_column("jobs", "opportunity_type")
    op.drop_index("ix_candidate_progress_candidate_id", table_name="candidate_progress")
    op.drop_table("candidate_progress")
