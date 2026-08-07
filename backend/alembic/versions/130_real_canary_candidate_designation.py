"""Alembic 130 — real canary candidate designation (Founder-controlled).

Revision ID: 130_real_canary_candidate_designation
Revises: 129_private_canary_activation_readiness
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "130_real_canary_candidate_designation"
down_revision: Union[str, None] = "129_private_canary_activation_readiness"
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
    if _has_table("real_canary_candidate_designations"):
        return
    op.create_table(
        "real_canary_candidate_designations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("designation_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DESIGNATED_READY"),
        sa.Column("delivery_channel", sa.String(length=32), nullable=False, server_default="email"),
        sa.Column("delivery_identity_ciphertext", sa.Text(), nullable=False),
        sa.Column("delivery_identity_hash", sa.String(length=64), nullable=False),
        sa.Column("delivery_identity_masked", sa.String(length=128), nullable=False),
        sa.Column("secure_roster_reference", sa.String(length=128), nullable=True),
        sa.Column("designated_by_actor", sa.String(length=64), nullable=False, server_default="ops_admin"),
        sa.Column("audit_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("lane", sa.String(length=16), nullable=False, server_default="REAL"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
        sa.Column("designated_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("designation_id", name="uq_canary_designation_id"),
    )
    op.create_index(
        "ix_canary_designation_status",
        "real_canary_candidate_designations",
        ["status"],
    )
    op.create_index(
        "ix_canary_designation_hash",
        "real_canary_candidate_designations",
        ["delivery_identity_hash"],
    )
    # Partial uniqueness of active REAL designations enforced in service (fail-closed AMBIGUOUS).


def downgrade() -> None:
    if _has_table("real_canary_candidate_designations"):
        op.drop_table("real_canary_candidate_designations")
