"""Activation auto-matching jobs + metrics exclusion flag."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "085_activation_ttv"
down_revision: Union[str, None] = "084_product_funnel_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = {c["name"] for c in inspect(bind).get_columns(table)}
    return column in cols


def _has_index(table: str, index_name: str) -> bool:
    bind = op.get_bind()
    return any(ix["name"] == index_name for ix in inspect(bind).get_indexes(table))


def upgrade() -> None:
    if _has_table("users") and not _has_column("users", "exclude_from_product_metrics"):
        op.add_column(
            "users",
            sa.Column(
                "exclude_from_product_metrics",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
        )
        if not _has_index("users", "ix_users_exclude_from_product_metrics"):
            op.create_index(
                "ix_users_exclude_from_product_metrics",
                "users",
                ["exclude_from_product_metrics"],
            )

    if not _has_table("activation_matching_jobs"):
        op.create_table(
            "activation_matching_jobs",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column(
                "candidate_id",
                sa.Integer(),
                sa.ForeignKey("candidates.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("profile_version", sa.String(length=64), nullable=False),
            sa.Column("correlation_id", sa.String(length=36), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
            sa.Column("failure_category", sa.String(length=64), nullable=True),
            sa.Column("match_count", sa.Integer(), nullable=True),
            sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("celery_task_id", sa.String(length=64), nullable=True),
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
            sa.Column("dispatched_at", sa.DateTime(), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "user_id",
                "profile_version",
                name="uq_activation_matching_user_profile_version",
            ),
        )
    if _has_table("activation_matching_jobs"):
        for name, cols in (
            ("ix_activation_matching_jobs_user_id", ["user_id"]),
            ("ix_activation_matching_jobs_status", ["status"]),
            ("ix_activation_matching_jobs_created_at", ["created_at"]),
            ("ix_activation_matching_jobs_correlation_id", ["correlation_id"]),
            ("ix_activation_matching_jobs_status_created", ["status", "created_at"]),
        ):
            if not _has_index("activation_matching_jobs", name):
                op.create_index(name, "activation_matching_jobs", cols)

    # Composite for TTV latency windows (event_name + occurred_at) — avoid full scans on 7/30/90d.
    if _has_table("product_funnel_events") and not _has_index(
        "product_funnel_events", "ix_product_funnel_events_name_occurred"
    ):
        op.create_index(
            "ix_product_funnel_events_name_occurred",
            "product_funnel_events",
            ["event_name", "occurred_at"],
        )


def downgrade() -> None:
    if _has_table("product_funnel_events") and _has_index(
        "product_funnel_events", "ix_product_funnel_events_name_occurred"
    ):
        op.drop_index("ix_product_funnel_events_name_occurred", table_name="product_funnel_events")

    if _has_table("activation_matching_jobs"):
        for name in (
            "ix_activation_matching_jobs_status_created",
            "ix_activation_matching_jobs_correlation_id",
            "ix_activation_matching_jobs_created_at",
            "ix_activation_matching_jobs_status",
            "ix_activation_matching_jobs_user_id",
        ):
            if _has_index("activation_matching_jobs", name):
                op.drop_index(name, table_name="activation_matching_jobs")
        op.drop_table("activation_matching_jobs")

    if _has_table("users") and _has_column("users", "exclude_from_product_metrics"):
        if _has_index("users", "ix_users_exclude_from_product_metrics"):
            op.drop_index("ix_users_exclude_from_product_metrics", table_name="users")
        op.drop_column("users", "exclude_from_product_metrics")
