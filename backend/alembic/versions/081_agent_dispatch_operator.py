"""Add restart-safe Agent Dispatcher Operator state."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "081_agent_dispatch_operator"
down_revision: Union[str, None] = "080_agent_dispatch_artifacts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    columns = {column["name"] for column in sa.inspect(bind).get_columns("agent_dispatch_runs")}
    additions = (
        ("operator_correlation_id", sa.String(length=64)),
        ("operator_requested_at", sa.DateTime()),
        ("operator_requested_by", sa.String(length=32)),
        ("operator_artifacts_json", sa.Text()),
        ("operator_updated_at", sa.DateTime()),
    )
    for name, column_type in additions:
        if name not in columns:
            op.add_column(
                "agent_dispatch_runs",
                sa.Column(name, column_type, nullable=True),
            )
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("agent_dispatch_runs")}
    if "ix_agent_dispatch_runs_operator_correlation_id" not in indexes:
        op.create_index(
            "ix_agent_dispatch_runs_operator_correlation_id",
            "agent_dispatch_runs",
            ["operator_correlation_id"],
        )
    if "ix_agent_dispatch_runs_operator_requested_at" not in indexes:
        op.create_index(
            "ix_agent_dispatch_runs_operator_requested_at",
            "agent_dispatch_runs",
            ["operator_requested_at"],
        )
    if not bind.dialect.has_table(bind, "agent_dispatch_operator_operations"):
        op.create_table(
            "agent_dispatch_operator_operations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("run_id", sa.String(length=36), nullable=False),
            sa.Column("operation", sa.String(length=64), nullable=False),
            sa.Column("idempotency_key", sa.String(length=128), nullable=False),
            sa.Column("correlation_id", sa.String(length=64), nullable=False),
            sa.Column("owner_token", sa.String(length=64), nullable=True),
            sa.Column("lease_expires_at", sa.DateTime(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("attempt_count", sa.Integer(), nullable=False),
            sa.Column("artifact_json", sa.Text(), nullable=True),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(
                ["run_id"],
                ["agent_dispatch_runs.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "run_id",
                "operation",
                "idempotency_key",
                name="uq_agent_dispatch_operator_operation",
            ),
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_run_id",
            "agent_dispatch_operator_operations",
            ["run_id"],
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_operation",
            "agent_dispatch_operator_operations",
            ["operation"],
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_correlation_id",
            "agent_dispatch_operator_operations",
            ["correlation_id"],
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_owner_token",
            "agent_dispatch_operator_operations",
            ["owner_token"],
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_lease_expires_at",
            "agent_dispatch_operator_operations",
            ["lease_expires_at"],
        )
        op.create_index(
            "ix_agent_dispatch_operator_operations_status",
            "agent_dispatch_operator_operations",
            ["status"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "agent_dispatch_operator_operations"):
        op.drop_table("agent_dispatch_operator_operations")
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("agent_dispatch_runs")}
    if "ix_agent_dispatch_runs_operator_correlation_id" in indexes:
        op.drop_index(
            "ix_agent_dispatch_runs_operator_correlation_id",
            table_name="agent_dispatch_runs",
        )
    if "ix_agent_dispatch_runs_operator_requested_at" in indexes:
        op.drop_index(
            "ix_agent_dispatch_runs_operator_requested_at",
            table_name="agent_dispatch_runs",
        )
    columns = {column["name"] for column in sa.inspect(bind).get_columns("agent_dispatch_runs")}
    for name in (
        "operator_updated_at",
        "operator_artifacts_json",
        "operator_requested_by",
        "operator_requested_at",
        "operator_correlation_id",
    ):
        if name in columns:
            op.drop_column("agent_dispatch_runs", name)
