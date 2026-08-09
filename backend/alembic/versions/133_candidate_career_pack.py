"""Epic 2.17 — candidate career pack tables.

Revision ID: 133_candidate_career_pack
Revises: 132_candidate_path_readiness

Does not touch canary/invite/enrollment/designation tables.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "133_candidate_career_pack"
down_revision: Union[str, None] = "132_candidate_path_readiness"
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
    if not _has_table("candidate_career_packs"):
        op.create_table(
            "candidate_career_packs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("pack_key", sa.String(length=64), nullable=False),
            sa.Column("pack_type", sa.String(length=64), nullable=False),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="DRAFT"),
            sa.Column("schema_version", sa.String(length=48), nullable=False, server_default="twin.candidate_career_pack/v1"),
            sa.Column("title", sa.String(length=300), nullable=False, server_default="Career Pack"),
            sa.Column("artifact_refs_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("disclosure_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("preview_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("preview_hash", sa.String(length=64), nullable=True),
            sa.Column("snapshot_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("snapshot_hash", sa.String(length=64), nullable=True),
            sa.Column("immutable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("pdf_bytes", sa.LargeBinary(), nullable=True),
            sa.Column("zip_bytes", sa.LargeBinary(), nullable=True),
            sa.Column("byte_size", sa.Integer(), nullable=True),
            sa.Column("download_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(), nullable=True),
            sa.Column("generated_at", sa.DateTime(), nullable=True),
            sa.Column("stale_confirmed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("external_delivery", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("first_value_satisfied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("candidate_id", "pack_key", name="uq_career_pack_key"),
        )
        op.create_index("ix_career_pack_candidate", "candidate_career_packs", ["candidate_id"])
        op.create_index("ix_career_pack_state", "candidate_career_packs", ["state"])

    if not _has_table("candidate_career_pack_audits"):
        op.create_table(
            "candidate_career_pack_audits",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("pack_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=64), nullable=False),
            sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_career_pack_audit_candidate", "candidate_career_pack_audits", ["candidate_id"])


def downgrade() -> None:
    for name in ("candidate_career_pack_audits", "candidate_career_packs"):
        if _has_table(name):
            op.drop_table(name)
