"""Epic 2.12 — candidate import ledger table.

Revision ID: 128_candidate_owned_import
Revises: 127_guided_first_value_demo
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "128_candidate_owned_import"
down_revision: Union[str, None] = "127_guided_first_value_demo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :n LIMIT 1"
        ),
        {"n": name},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    if not _has_table("candidate_import_batches"):
        op.create_table(
            "candidate_import_batches",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("batch_key", sa.String(length=64), nullable=False),
            sa.Column("family", sa.String(length=32), nullable=False),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="DRAFT"),
            sa.Column("schema_version", sa.String(length=32), nullable=False, server_default="candidate_owned_import_v1"),
            sa.Column("content_hash", sa.String(length=64), nullable=True),
            sa.Column("byte_size", sa.Integer(), nullable=True),
            sa.Column("ext", sa.String(length=16), nullable=True),
            sa.Column("ciphertext_b64", sa.Text(), nullable=True),
            sa.Column("staging_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("preview_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("approval_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("commit_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("rollback_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("audit_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("idempotency_key", sa.String(length=64), nullable=True),
            sa.Column("rejection_code", sa.String(length=64), nullable=True),
            sa.Column("canonical_mutations", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("preview_version", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "batch_key", name="uq_import_batch_key"),
        )
        op.create_index("ix_import_batch_user", "candidate_import_batches", ["user_id"])
        op.create_index("ix_import_batch_state", "candidate_import_batches", ["state"])
        op.create_index("ix_import_batch_idem", "candidate_import_batches", ["idempotency_key"])


def downgrade() -> None:
    if _has_table("candidate_import_batches"):
        op.drop_table("candidate_import_batches")
