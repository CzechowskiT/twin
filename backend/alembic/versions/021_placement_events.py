"""Append-only placement_events for verification audit trail."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_placement_events"
down_revision: Union[str, None] = "020_placement_verify"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "placement_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor", sa.String(length=32), nullable=False),
        sa.Column("detail_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_placement_events_application_id", "placement_events", ["application_id"], unique=False)
    op.create_index(
        "ix_placement_events_app_created",
        "placement_events",
        ["application_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_placement_events_app_created", table_name="placement_events")
    op.drop_index("ix_placement_events_application_id", table_name="placement_events")
    op.drop_table("placement_events")
