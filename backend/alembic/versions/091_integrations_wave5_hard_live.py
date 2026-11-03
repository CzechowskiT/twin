"""Integrations Wave 5 — capability inventory + webhook delivery ledger.

ORM: IntegrationCapabilityRecord, WebhookDeliveryAttempt
Service: app/services/integrations_wave5.py
API: app/api/integrations_wave5.py
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md Wave 5
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "091_integrations_wave5_hard_live"
down_revision: Union[str, None] = "090_company_wave3_hard_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("integration_capability_records"):
        op.create_table(
            "integration_capability_records",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("integration_key", sa.String(length=64), nullable=False),
            sa.Column("capability", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("blocker", sa.String(length=128), nullable=True),
            sa.Column("owner", sa.String(length=64), nullable=True),
            sa.Column("evidence_json", sa.Text(), nullable=True),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "integration_key",
                "capability",
                name="uq_integration_capability_key_cap",
            ),
        )
        op.create_index(
            "ix_integration_capability_key",
            "integration_capability_records",
            ["integration_key"],
        )
        op.create_index(
            "ix_integration_capability_status",
            "integration_capability_records",
            ["status"],
        )

    if not _has_table("webhook_delivery_attempts"):
        op.create_table(
            "webhook_delivery_attempts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("provider", sa.String(length=64), nullable=False),
            sa.Column("direction", sa.String(length=16), nullable=False),
            sa.Column("event_type", sa.String(length=128), nullable=False),
            sa.Column("idempotency_key", sa.String(length=128), nullable=True),
            sa.Column("signature_ok", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("replay_rejected", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("http_status", sa.Integer(), nullable=True),
            sa.Column("attempt_n", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_webhook_delivery_provider",
            "webhook_delivery_attempts",
            ["provider"],
        )
        op.create_index(
            "ix_webhook_delivery_idempotency",
            "webhook_delivery_attempts",
            ["idempotency_key"],
        )
        op.create_index(
            "ix_webhook_delivery_created",
            "webhook_delivery_attempts",
            ["created_at"],
        )


def downgrade() -> None:
    if _has_table("webhook_delivery_attempts"):
        op.drop_index("ix_webhook_delivery_created", table_name="webhook_delivery_attempts")
        op.drop_index("ix_webhook_delivery_idempotency", table_name="webhook_delivery_attempts")
        op.drop_index("ix_webhook_delivery_provider", table_name="webhook_delivery_attempts")
        op.drop_table("webhook_delivery_attempts")
    if _has_table("integration_capability_records"):
        op.drop_index("ix_integration_capability_status", table_name="integration_capability_records")
        op.drop_index("ix_integration_capability_key", table_name="integration_capability_records")
        op.drop_table("integration_capability_records")
