"""Add AI Candidate Intelligence real-validation plan + event tables.

Revision ID: 104_ai_intel_validation
Revises: 103_candidate_intelligence
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "104_ai_intel_validation"
down_revision: Union[str, None] = "103_candidate_intelligence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pilot_ai_validation_plans",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("pilot_organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="DRAFT"),
        sa.Column("plan_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index(
        "ix_pilot_ai_validation_plans_organization_id",
        "pilot_ai_validation_plans",
        ["organization_id"],
    )
    op.create_index(
        "ix_pilot_ai_validation_plans_status",
        "pilot_ai_validation_plans",
        ["status"],
    )

    op.create_table(
        "pilot_ai_validation_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "organization_id",
            sa.Integer(),
            sa.ForeignKey("pilot_organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tenant_id", sa.Integer(), nullable=True),
        sa.Column("event_name", sa.String(length=64), nullable=False),
        sa.Column("persona", sa.String(length=32), nullable=False, server_default="recruiter"),
        sa.Column("workflow_id", sa.String(length=64), nullable=True),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pilot_ai_validation_events_organization_id",
        "pilot_ai_validation_events",
        ["organization_id"],
    )
    op.create_index(
        "ix_pilot_ai_validation_events_tenant_id",
        "pilot_ai_validation_events",
        ["tenant_id"],
    )
    op.create_index(
        "ix_pilot_ai_validation_events_event_name",
        "pilot_ai_validation_events",
        ["event_name"],
    )
    op.create_index(
        "ix_pilot_ai_validation_events_is_synthetic",
        "pilot_ai_validation_events",
        ["is_synthetic"],
    )
    op.create_index(
        "ix_pilot_ai_validation_events_created_at",
        "pilot_ai_validation_events",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_table("pilot_ai_validation_events")
    op.drop_table("pilot_ai_validation_plans")
