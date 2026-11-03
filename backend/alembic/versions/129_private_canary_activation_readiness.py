"""Epic 2.14 — Alembic 129 private one-candidate canary readiness.

Revision ID: 129_private_canary_activation_readiness
Revises: 128_candidate_owned_import
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "129_private_canary_activation_readiness"
down_revision: Union[str, None] = "128_candidate_owned_import"
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


def _has_column(table: str, column: str) -> bool:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c LIMIT 1"
        ),
        {"t": table, "c": column},
    ).fetchall()
    return bool(rows)


def upgrade() -> None:
    if not _has_table("one_candidate_canary_control"):
        op.create_table(
            "one_candidate_canary_control",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("singleton_key", sa.String(length=32), nullable=False),
            sa.Column("state", sa.String(length=48), nullable=False, server_default="READY_INACTIVE"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("max_real_candidates", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("max_real_invites", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("real_candidates_bound", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("real_invites_created", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("activation_command", sa.String(length=64), nullable=False, server_default="PREPARED_NOT_EXECUTED"),
            sa.Column("gate_ready", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("checklist_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("audit_json", sa.Text(), nullable=False, server_default="[]"),
            sa.Column("abort_reason", sa.String(length=200), nullable=True),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="FACT"),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("singleton_key", name="uq_canary_control_singleton"),
        )
        op.create_index("ix_canary_control_state", "one_candidate_canary_control", ["state"])

    if not _has_table("candidate_canary_friction_events"):
        op.create_table(
            "candidate_canary_friction_events",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_code", sa.String(length=64), nullable=False),
            sa.Column("surface", sa.String(length=64), nullable=True),
            sa.Column("lane", sa.String(length=16), nullable=False, server_default="SYNTHETIC"),
            sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_canary_friction_candidate", "candidate_canary_friction_events", ["candidate_id"])

    # Ladder columns on guided FV (no second first-value contract)
    if _has_table("candidate_guided_first_value"):
        if not _has_column("candidate_guided_first_value", "fv_ladder"):
            op.add_column(
                "candidate_guided_first_value",
                sa.Column("fv_ladder", sa.String(length=32), nullable=False, server_default="READY"),
            )
        if not _has_column("candidate_guided_first_value", "fv_viewed_at"):
            op.add_column(
                "candidate_guided_first_value",
                sa.Column("fv_viewed_at", sa.DateTime(), nullable=True),
            )
        if not _has_column("candidate_guided_first_value", "fv_acknowledged_at"):
            op.add_column(
                "candidate_guided_first_value",
                sa.Column("fv_acknowledged_at", sa.DateTime(), nullable=True),
            )
        if not _has_column("candidate_guided_first_value", "fv_actioned_at"):
            op.add_column(
                "candidate_guided_first_value",
                sa.Column("fv_actioned_at", sa.DateTime(), nullable=True),
            )


def downgrade() -> None:
    if _has_table("candidate_canary_friction_events"):
        op.drop_table("candidate_canary_friction_events")
    if _has_table("one_candidate_canary_control"):
        op.drop_table("one_candidate_canary_control")
    # Keep ladder columns on downgrade (non-destructive)
