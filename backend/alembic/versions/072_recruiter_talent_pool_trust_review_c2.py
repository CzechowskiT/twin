"""Recruiter talent pool + trust review queue persistence (Wave C slice 2)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "072_recruiter_talent_pool_trust_review_c2"
down_revision: Union[str, None] = "071_recruiter_workspace_activation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recruiter_talent_pool_records",
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="csv_import"),
    )
    op.add_column(
        "recruiter_talent_pool_records",
        sa.Column("snapshot_json", sa.Text(), nullable=True),
    )
    op.add_column(
        "recruiter_talent_pool_records",
        sa.Column("archived_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "recruiter_talent_pool_records",
        sa.Column("consent_visibility", sa.String(length=32), nullable=False, server_default="unknown"),
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_archived_at",
        "recruiter_talent_pool_records",
        ["archived_at"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_source_type",
        "recruiter_talent_pool_records",
        ["source_type"],
    )

    op.create_table(
        "recruiter_trust_review_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("item_kind", sa.String(length=64), nullable=False),
        sa.Column("subject_ref", sa.String(length=128), nullable=False),
        sa.Column("privacy_request_id", sa.Integer(), nullable=True),
        sa.Column("candidate_ref", sa.String(length=64), nullable=True),
        sa.Column("reason_key", sa.String(length=64), nullable=False),
        sa.Column("reason_summary", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending_review"),
        sa.Column("priority", sa.String(length=16), nullable=True),
        sa.Column("consent_state", sa.String(length=32), nullable=False, server_default="unknown"),
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
        sa.ForeignKeyConstraint(
            ["privacy_request_id"],
            ["candidate_privacy_requests.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_slug",
            "privacy_request_id",
            name="uq_recruiter_trust_review_company_privacy_request",
        ),
    )
    op.create_index(
        "ix_recruiter_trust_review_items_company_slug",
        "recruiter_trust_review_items",
        ["company_slug"],
    )
    op.create_index(
        "ix_recruiter_trust_review_items_status",
        "recruiter_trust_review_items",
        ["status"],
    )
    op.create_index(
        "ix_recruiter_trust_review_items_created_at",
        "recruiter_trust_review_items",
        ["created_at"],
    )

    op.create_table(
        "recruiter_trust_review_decisions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("actor_ref", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["item_id"],
            ["recruiter_trust_review_items.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recruiter_trust_review_decisions_item_id",
        "recruiter_trust_review_decisions",
        ["item_id"],
    )
    op.create_index(
        "ix_recruiter_trust_review_decisions_created_at",
        "recruiter_trust_review_decisions",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_trust_review_decisions_created_at", table_name="recruiter_trust_review_decisions")
    op.drop_index("ix_recruiter_trust_review_decisions_item_id", table_name="recruiter_trust_review_decisions")
    op.drop_table("recruiter_trust_review_decisions")
    op.drop_index("ix_recruiter_trust_review_items_created_at", table_name="recruiter_trust_review_items")
    op.drop_index("ix_recruiter_trust_review_items_status", table_name="recruiter_trust_review_items")
    op.drop_index("ix_recruiter_trust_review_items_company_slug", table_name="recruiter_trust_review_items")
    op.drop_table("recruiter_trust_review_items")
    op.drop_index("ix_recruiter_talent_pool_records_source_type", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_archived_at", table_name="recruiter_talent_pool_records")
    op.drop_column("recruiter_talent_pool_records", "consent_visibility")
    op.drop_column("recruiter_talent_pool_records", "archived_at")
    op.drop_column("recruiter_talent_pool_records", "snapshot_json")
    op.drop_column("recruiter_talent_pool_records", "source_type")
