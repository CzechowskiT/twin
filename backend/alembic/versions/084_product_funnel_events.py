"""Append-only product funnel events for north-star metrics."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "084_product_funnel_events"
down_revision: Union[str, None] = "083_founder_command"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def _has_index(table: str, index_name: str) -> bool:
    bind = op.get_bind()
    return any(ix["name"] == index_name for ix in inspect(bind).get_indexes(table))


def upgrade() -> None:
    if not _has_table("product_funnel_events"):
        op.create_table(
            "product_funnel_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("persona", sa.String(length=32), nullable=False, server_default="candidate"),
            sa.Column("event_name", sa.String(length=64), nullable=False),
            sa.Column("signup_week", sa.String(length=10), nullable=True),
            sa.Column("properties_json", sa.Text(), nullable=True),
            sa.Column(
                "occurred_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index("product_funnel_events", "ix_product_funnel_events_user_id"):
        op.create_index("ix_product_funnel_events_user_id", "product_funnel_events", ["user_id"])
    if not _has_index("product_funnel_events", "ix_product_funnel_events_event_name"):
        op.create_index("ix_product_funnel_events_event_name", "product_funnel_events", ["event_name"])
    if not _has_index("product_funnel_events", "ix_product_funnel_events_occurred_at"):
        op.create_index("ix_product_funnel_events_occurred_at", "product_funnel_events", ["occurred_at"])
    if not _has_index("product_funnel_events", "ix_product_funnel_events_signup_week"):
        op.create_index("ix_product_funnel_events_signup_week", "product_funnel_events", ["signup_week"])
    if not _has_index("product_funnel_events", "ix_product_funnel_events_user_event"):
        op.create_index(
            "ix_product_funnel_events_user_event",
            "product_funnel_events",
            ["user_id", "event_name"],
        )


def downgrade() -> None:
    if _has_table("product_funnel_events"):
        for name in (
            "ix_product_funnel_events_user_event",
            "ix_product_funnel_events_signup_week",
            "ix_product_funnel_events_occurred_at",
            "ix_product_funnel_events_event_name",
            "ix_product_funnel_events_user_id",
        ):
            if _has_index("product_funnel_events", name):
                op.drop_index(name, table_name="product_funnel_events")
        op.drop_table("product_funnel_events")
