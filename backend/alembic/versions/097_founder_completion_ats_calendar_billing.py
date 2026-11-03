"""Founder completion — ATS sync, company calendar, billing, AI external verify tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "097_founder_completion_ats_calendar_billing"
down_revision: Union[str, None] = "096_connector_secret_hash_widen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has(table: str) -> bool:
    return table in inspect(op.get_bind()).get_table_names()


def upgrade() -> None:
    if not _has("ats_sync_attempts"):
        op.create_table(
            "ats_sync_attempts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_slug", sa.String(80), nullable=False, index=True),
            sa.Column("provider", sa.String(32), nullable=False, index=True),
            sa.Column("direction", sa.String(16), nullable=False, server_default="write"),
            sa.Column("external_id", sa.String(128), nullable=True, index=True),
            sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
            sa.Column("payload_json", sa.Text(), nullable=True),
            sa.Column("error_code", sa.String(64), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )
    if not _has("company_calendar_connections"):
        op.create_table(
            "company_calendar_connections",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_slug", sa.String(80), nullable=False, index=True),
            sa.Column("provider", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="disconnected"),
            sa.Column("token_encrypted", sa.Text(), nullable=True),
            sa.Column("scopes", sa.String(512), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("company_slug", "provider", name="uq_company_calendar_slug_provider"),
        )
    if not _has("company_billing_accounts"):
        op.create_table(
            "company_billing_accounts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_slug", sa.String(80), nullable=False, index=True),
            sa.Column("stripe_customer_id", sa.String(128), nullable=True),
            sa.Column("plan_sku", sa.String(64), nullable=True),
            sa.Column("checkout_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.UniqueConstraint("company_slug", name="uq_company_billing_slug"),
        )
    if not _has("career_claim_external_verifications"):
        op.create_table(
            "career_claim_external_verifications",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("claim_id", sa.Integer(), nullable=False, index=True),
            sa.Column("provider", sa.String(64), nullable=False),
            sa.Column("request_id", sa.String(128), nullable=True),
            sa.Column("result_status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("result_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    if not _has("company_calendar_holds"):
        op.create_table(
            "company_calendar_holds",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("company_slug", sa.String(80), nullable=False, index=True),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("starts_at", sa.DateTime(), nullable=False),
            sa.Column("ends_at", sa.DateTime(), nullable=False),
            sa.Column("provider", sa.String(32), nullable=False, server_default="local"),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("provider_event_id", sa.String(128), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
        )
    # Controlled release: enable sandbox external verification flag when present.
    if _has("feature_flag_states"):
        op.execute(
            sa.text(
                "UPDATE feature_flag_states SET enabled = true "
                "WHERE flag_key = 'AI_EXTERNAL_VERIFICATION_ENABLED'"
            )
        )


def downgrade() -> None:
    for table in (
        "company_calendar_holds",
        "career_claim_external_verifications",
        "company_billing_accounts",
        "company_calendar_connections",
        "ats_sync_attempts",
    ):
        if _has(table):
            op.drop_table(table)
