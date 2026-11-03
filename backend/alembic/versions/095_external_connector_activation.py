"""External connector activation — Zapier subscriptions + Google push channels.

ORM: ConnectorWebhookSubscription, GoogleCalendarPushChannel, ConnectorTestReceiverEvent
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "095_external_connector_activation"
down_revision: Union[str, None] = "094_gap_close_dsr_sla_ics"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    return name in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not _has_table("connector_webhook_subscriptions"):
        op.create_table(
            "connector_webhook_subscriptions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(length=32), nullable=False),
            sa.Column("target_url", sa.String(length=512), nullable=False),
            sa.Column("secret_hash", sa.String(length=512), nullable=False),
            sa.Column("secret_prefix", sa.String(length=12), nullable=False),
            sa.Column("event_filter", sa.String(length=128), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("payload_version", sa.String(length=16), nullable=False, server_default="v1"),
            sa.Column("last_delivery_at", sa.DateTime(), nullable=True),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
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
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_connector_webhook_sub_user",
            "connector_webhook_subscriptions",
            ["user_id"],
        )
        op.create_index(
            "ix_connector_webhook_sub_provider",
            "connector_webhook_subscriptions",
            ["provider"],
        )

    if not _has_table("google_calendar_push_channels"):
        op.create_table(
            "google_calendar_push_channels",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("channel_id", sa.String(length=128), nullable=False),
            sa.Column("resource_id", sa.String(length=256), nullable=True),
            sa.Column("calendar_id", sa.String(length=256), nullable=False, server_default="primary"),
            sa.Column("expiration_ms", sa.BigInteger(), nullable=True),
            sa.Column("channel_token_hash", sa.String(length=128), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("last_notification_at", sa.DateTime(), nullable=True),
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
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("channel_id", name="uq_gcal_push_channel_id"),
        )
        op.create_index(
            "ix_gcal_push_channels_user",
            "google_calendar_push_channels",
            ["user_id"],
        )

    if not _has_table("connector_test_receiver_events"):
        op.create_table(
            "connector_test_receiver_events",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("subscription_id", sa.Integer(), nullable=True),
            sa.Column("event_id", sa.String(length=128), nullable=False),
            sa.Column("provider", sa.String(length=32), nullable=False),
            sa.Column("signature_ok", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("replay_rejected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("event_id", name="uq_connector_test_receiver_event_id"),
        )
        op.create_index(
            "ix_connector_test_receiver_created",
            "connector_test_receiver_events",
            ["created_at"],
        )


def downgrade() -> None:
    if _has_table("connector_test_receiver_events"):
        op.drop_index(
            "ix_connector_test_receiver_created",
            table_name="connector_test_receiver_events",
        )
        op.drop_table("connector_test_receiver_events")
    if _has_table("google_calendar_push_channels"):
        op.drop_index("ix_gcal_push_channels_user", table_name="google_calendar_push_channels")
        op.drop_table("google_calendar_push_channels")
    if _has_table("connector_webhook_subscriptions"):
        op.drop_index("ix_connector_webhook_sub_provider", table_name="connector_webhook_subscriptions")
        op.drop_index("ix_connector_webhook_sub_user", table_name="connector_webhook_subscriptions")
        op.drop_table("connector_webhook_subscriptions")
