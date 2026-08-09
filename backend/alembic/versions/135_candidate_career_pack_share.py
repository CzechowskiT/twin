"""Epic 2.19 — career pack share grants table.

Revision ID: 135_candidate_career_pack_share
Revises: 134_candidate_journey_continuity

Minimal grant fields only — no content copy, no recipient PII.
No canary/invite DML. PARALLEL_CAREER_PACK_STORE=NONE.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "135_candidate_career_pack_share"
down_revision: Union[str, None] = "134_candidate_journey_continuity"
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
    if _has_table("candidate_career_pack_share_grants"):
        return
    op.create_table(
        "candidate_career_pack_share_grants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "candidate_id",
            sa.Integer(),
            sa.ForeignKey("candidates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pack_id",
            sa.Integer(),
            sa.ForeignKey("candidate_career_packs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("grant_key", sa.String(length=64), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("secret_digest", sa.String(length=128), nullable=False),
        sa.Column("permission", sa.String(length=32), nullable=False, server_default="INLINE_VIEW"),
        sa.Column("state", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("pack_snapshot_hash", sa.String(length=64), nullable=False),
        sa.Column("disclosure_hash", sa.String(length=64), nullable=False),
        sa.Column("schema_version", sa.String(length=64), nullable=False, server_default="twin.candidate_career_pack_share_grant/v1"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("first_value_satisfied", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("public_id", name="uq_career_pack_share_public_id"),
        sa.UniqueConstraint("candidate_id", "grant_key", name="uq_career_pack_share_grant_key"),
    )
    op.create_index("ix_cps_grant_candidate", "candidate_career_pack_share_grants", ["candidate_id"])
    op.create_index("ix_cps_grant_pack", "candidate_career_pack_share_grants", ["pack_id"])
    op.create_index("ix_cps_grant_state", "candidate_career_pack_share_grants", ["state"])


def downgrade() -> None:
    if _has_table("candidate_career_pack_share_grants"):
        op.drop_table("candidate_career_pack_share_grants")
