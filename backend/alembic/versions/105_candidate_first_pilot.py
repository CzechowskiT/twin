"""Add candidate-first pilot cohort + invitation pack tables.

Revision ID: 105_candidate_first_pilot
Revises: 104_ai_intel_validation
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "105_candidate_first_pilot"
down_revision: Union[str, None] = "104_ai_intel_validation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_pilot_cohorts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("founder_cohort_approval_ref", sa.String(length=128), nullable=True),
        sa.Column("approved_by_label", sa.String(length=120), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("success_criteria_ref", sa.String(length=200), nullable=True),
        sa.Column("data_processing_basis_ref", sa.String(length=128), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_candidate_pilot_cohorts_slug", "candidate_pilot_cohorts", ["slug"])
    op.create_index("ix_candidate_pilot_cohorts_status", "candidate_pilot_cohorts", ["status"])
    op.create_index(
        "ix_candidate_pilot_cohorts_is_synthetic", "candidate_pilot_cohorts", ["is_synthetic"]
    )

    op.create_table(
        "candidate_pilot_invitation_packs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "cohort_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("recipients_json", sa.Text(), nullable=True),
        sa.Column(
            "template_key",
            sa.String(length=128),
            nullable=False,
            server_default="candidate_first_invite_v1",
        ),
        sa.Column("pack_content_json", sa.Text(), nullable=True),
        sa.Column("prepared_at", sa.DateTime(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("founder_send_approval_ref", sa.String(length=128), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_candidate_pilot_invitation_packs_cohort_id",
        "candidate_pilot_invitation_packs",
        ["cohort_id"],
    )
    op.create_index(
        "ix_candidate_pilot_invitation_packs_status",
        "candidate_pilot_invitation_packs",
        ["status"],
    )

    op.create_table(
        "candidate_pilot_intake_rows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "cohort_id",
            sa.Integer(),
            sa.ForeignKey("candidate_pilot_cohorts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email_masked", sa.String(length=200), nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("locale", sa.String(length=8), nullable=False, server_default="pl"),
        sa.Column("consent_basis_ref", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="INTAKE"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cohort_id", "email_hash", name="uq_candidate_pilot_intake_email"),
    )
    op.create_index(
        "ix_candidate_pilot_intake_rows_cohort_id", "candidate_pilot_intake_rows", ["cohort_id"]
    )
    op.create_index(
        "ix_candidate_pilot_intake_rows_status", "candidate_pilot_intake_rows", ["status"]
    )


def downgrade() -> None:
    op.drop_table("candidate_pilot_intake_rows")
    op.drop_table("candidate_pilot_invitation_packs")
    op.drop_table("candidate_pilot_cohorts")
