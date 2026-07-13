"""Recruiter workspace activation persistence (Wave C slice 1)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "071_recruiter_workspace_activation"
down_revision: Union[str, None] = "070_candidate_trust_center"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recruiter_workspace_activation",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("workspace_connected_at", sa.DateTime(), nullable=True),
        sa.Column("queue_loaded_at", sa.DateTime(), nullable=True),
        sa.Column("first_decision_at", sa.DateTime(), nullable=True),
        sa.Column("first_decision_action", sa.String(length=16), nullable=True),
        sa.Column("activation_completed_at", sa.DateTime(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_slug", name="uq_recruiter_workspace_activation_company_slug"),
    )
    op.create_index(
        "ix_recruiter_workspace_activation_company_slug",
        "recruiter_workspace_activation",
        ["company_slug"],
    )

    op.create_table(
        "recruiter_activation_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("step", sa.String(length=64), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recruiter_activation_events_company_slug",
        "recruiter_activation_events",
        ["company_slug"],
    )
    op.create_index(
        "ix_recruiter_activation_events_created_at",
        "recruiter_activation_events",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_activation_events_created_at", table_name="recruiter_activation_events")
    op.drop_index("ix_recruiter_activation_events_company_slug", table_name="recruiter_activation_events")
    op.drop_table("recruiter_activation_events")
    op.drop_index(
        "ix_recruiter_workspace_activation_company_slug",
        table_name="recruiter_workspace_activation",
    )
    op.drop_table("recruiter_workspace_activation")
