"""Append-only cookie_consent_events for GDPR audit (browser + optional user link)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "045_cookie_consent_events"
down_revision: Union[str, None] = "044_ats_oauth_tokens_data_room_key"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cookie_consent_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("visitor_key_hash", sa.String(length=64), nullable=False),
        sa.Column("consent_version", sa.Integer(), nullable=False),
        sa.Column("choices_json", sa.Text(), nullable=False),
        sa.Column("decided_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cookie_consent_events_user_id", "cookie_consent_events", ["user_id"], unique=False)
    op.create_index(
        "ix_cookie_consent_events_visitor_hash",
        "cookie_consent_events",
        ["visitor_key_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_cookie_consent_events_visitor_hash", table_name="cookie_consent_events")
    op.drop_index("ix_cookie_consent_events_user_id", table_name="cookie_consent_events")
    op.drop_table("cookie_consent_events")
