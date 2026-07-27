"""Candidate-first Phase 2 production hardening.

Revision ID: 106_candidate_first_phase2_hardening
Revises: 105_candidate_first_pilot

Adds invite tokens, encrypted intake emails, onboarding progress persistence,
and registration allowlist bridge (hash-only).
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "106_candidate_first_phase2_hardening"
down_revision: Union[str, None] = "105_candidate_first_pilot"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidate_pilot_intake_rows",
        sa.Column("email_ciphertext", sa.Text(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("onboarding_step", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("onboarding_progress_json", sa.Text(), nullable=True),
    )

    op.create_table(
        "candidate_invite_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "cohort_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pack_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_invitation_packs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "intake_row_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_intake_rows.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("email_masked", sa.String(length=200), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("last_validate_at", sa.DateTime(), nullable=True),
        sa.Column("validate_fail_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_candidate_invite_token_hash"),
    )
    op.create_index("ix_candidate_invite_tokens_cohort_id", "candidate_invite_tokens", ["cohort_id"])
    op.create_index("ix_candidate_invite_tokens_pack_id", "candidate_invite_tokens", ["pack_id"])
    op.create_index("ix_candidate_invite_tokens_email_hash", "candidate_invite_tokens", ["email_hash"])
    op.create_index("ix_candidate_invite_tokens_status", "candidate_invite_tokens", ["status"])
    op.create_index("ix_candidate_invite_tokens_expires_at", "candidate_invite_tokens", ["expires_at"])

    op.create_table(
        "candidate_pilot_allowlist",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("email_masked", sa.String(length=200), nullable=False),
        sa.Column(
            "cohort_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "pack_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_invitation_packs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="founder_send"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_hash", name="uq_candidate_pilot_allowlist_email_hash"),
    )
    op.create_index(
        "ix_candidate_pilot_allowlist_email_hash", "candidate_pilot_allowlist", ["email_hash"]
    )
    op.create_index("ix_candidate_pilot_allowlist_active", "candidate_pilot_allowlist", ["active"])


def downgrade() -> None:
    op.drop_index("ix_candidate_pilot_allowlist_active", table_name="candidate_pilot_allowlist")
    op.drop_index("ix_candidate_pilot_allowlist_email_hash", table_name="candidate_pilot_allowlist")
    op.drop_table("candidate_pilot_allowlist")
    op.drop_index("ix_candidate_invite_tokens_expires_at", table_name="candidate_invite_tokens")
    op.drop_index("ix_candidate_invite_tokens_status", table_name="candidate_invite_tokens")
    op.drop_index("ix_candidate_invite_tokens_email_hash", table_name="candidate_invite_tokens")
    op.drop_index("ix_candidate_invite_tokens_pack_id", table_name="candidate_invite_tokens")
    op.drop_index("ix_candidate_invite_tokens_cohort_id", table_name="candidate_invite_tokens")
    op.drop_table("candidate_invite_tokens")
    op.drop_column("users", "onboarding_progress_json")
    op.drop_column("users", "onboarding_step")
    op.drop_column("candidate_pilot_intake_rows", "email_ciphertext")
