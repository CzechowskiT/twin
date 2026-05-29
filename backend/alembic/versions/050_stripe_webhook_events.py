"""Stripe webhook event ledger for at-least-once delivery dedup.

Pairs with:
- ORM model: app/database/models.py::StripeWebhookEvent (shipped in
  commit f341e1f, idle until this migration runs).
- Service helpers: app/services/stripe_events.py (shipped in
  commit f341e1f, idle until this migration runs).
- Wire-up: app/api/billing.py (already calls helpers; ledger activates
  once this migration runs on the target DB).

Design: docs/P2_STRIPE_EVENT_DEDUP_DESIGN_2026-05-27.md.
Deploy: docs/STRIPE_DEDUP_MIGRATION_RUNBOOK_2026-05-27.md.

DO NOT run on production without founder approval — see
docs/API_DEPLOY_DECISION_MEMO_2026-05-27.md and gate S5.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "050_stripe_webhook_events"
down_revision: Union[str, None] = "049_job_match_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("livemode", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "received_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "handler_status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_stripe_webhook_events_event_id"),
    )
    op.create_index(
        "ix_stripe_webhook_events_event_type",
        "stripe_webhook_events",
        ["event_type"],
    )
    op.create_index(
        "ix_stripe_webhook_events_received_at",
        "stripe_webhook_events",
        ["received_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_stripe_webhook_events_received_at",
        table_name="stripe_webhook_events",
    )
    op.drop_index(
        "ix_stripe_webhook_events_event_type",
        table_name="stripe_webhook_events",
    )
    op.drop_table("stripe_webhook_events")
