"""Idempotency keys, auto-apply audit events, optional billing profile fields."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_idempotency_auto_apply_partner_billing"
down_revision: Union[str, None] = "022_placement_declaration_note"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "api_idempotency",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("body_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("response_status", sa.SmallInteger(), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "scope", "idempotency_key", name="uq_api_idempotency_user_scope_key"),
    )
    op.create_index("ix_api_idempotency_user_created", "api_idempotency", ["user_id", "created_at"], unique=False)

    op.create_table(
        "auto_apply_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("company_key", sa.String(length=255), nullable=True),
        sa.Column("outcome", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auto_apply_events_user_created", "auto_apply_events", ["user_id", "created_at"], unique=False)
    op.create_index("ix_auto_apply_events_user_company_created", "auto_apply_events", ["user_id", "company_key", "created_at"], unique=False)

    op.add_column("users", sa.Column("billing_company_name", sa.String(length=200), nullable=True))
    op.add_column("users", sa.Column("billing_tax_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "billing_tax_id")
    op.drop_column("users", "billing_company_name")
    op.drop_index("ix_auto_apply_events_user_company_created", table_name="auto_apply_events")
    op.drop_index("ix_auto_apply_events_user_created", table_name="auto_apply_events")
    op.drop_table("auto_apply_events")
    op.drop_index("ix_api_idempotency_user_created", table_name="api_idempotency")
    op.drop_table("api_idempotency")
