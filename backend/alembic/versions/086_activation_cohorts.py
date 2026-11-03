"""Activation pilot cohorts + participants registry."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "086_activation_cohorts"
down_revision: Union[str, None] = "085_activation_ttv"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("activation_cohorts"):
        op.create_table(
            "activation_cohorts",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("cohort_type", sa.String(length=32), nullable=False),
            sa.Column("market", sa.String(length=64), nullable=False, server_default="PL"),
            sa.Column("language", sa.String(length=16), nullable=False, server_default="pl"),
            sa.Column("starts_at", sa.DateTime(), nullable=True),
            sa.Column("ends_at", sa.DateTime(), nullable=True),
            sa.Column("target_count", sa.Integer(), nullable=False, server_default="50"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("owner", sa.String(length=120), nullable=True),
            sa.Column("source", sa.String(length=128), nullable=True),
            sa.Column("campaign", sa.String(length=128), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_activation_cohorts_status", "activation_cohorts", ["status"])
        op.create_index("ix_activation_cohorts_cohort_type", "activation_cohorts", ["cohort_type"])
        op.create_index("ix_activation_cohorts_market", "activation_cohorts", ["market"])

    if not _has_table("activation_cohort_participants"):
        op.create_table(
            "activation_cohort_participants",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("cohort_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False),
            sa.Column("joined_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("source", sa.String(length=128), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="invited"),
            sa.Column(
                "exclude_from_product_metrics",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["cohort_id"], ["activation_cohorts.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("cohort_id", "user_id", name="uq_activation_cohort_user"),
        )
        op.create_index(
            "ix_activation_cohort_participants_cohort_id",
            "activation_cohort_participants",
            ["cohort_id"],
        )
        op.create_index(
            "ix_activation_cohort_participants_user_id",
            "activation_cohort_participants",
            ["user_id"],
        )
        op.create_index(
            "ix_activation_cohort_participants_status",
            "activation_cohort_participants",
            ["status"],
        )


def downgrade() -> None:
    if _has_table("activation_cohort_participants"):
        op.drop_table("activation_cohort_participants")
    if _has_table("activation_cohorts"):
        op.drop_table("activation_cohorts")
