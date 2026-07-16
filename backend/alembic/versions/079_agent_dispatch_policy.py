"""Agent Dispatcher policy columns — task_name, execution_policy, auto_create_pr default false."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "079_agent_dispatch_policy"
down_revision: Union[str, None] = "078_agent_dispatch"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    cols = {c["name"] for c in insp.get_columns("agent_dispatch_runs")}
    if "task_name" not in cols:
        op.add_column(
            "agent_dispatch_runs",
            sa.Column("task_name", sa.String(length=128), nullable=True),
        )
        op.create_index("ix_agent_dispatch_runs_task_name", "agent_dispatch_runs", ["task_name"])
    if "execution_policy_json" not in cols:
        op.add_column(
            "agent_dispatch_runs",
            sa.Column("execution_policy_json", sa.Text(), nullable=True),
        )
    # New rows: manual merge only — PR create is opt-in, never auto-merge.
    op.alter_column(
        "agent_dispatch_runs",
        "auto_create_pr",
        server_default=sa.text("false"),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("agent_dispatch_runs")}
    op.alter_column(
        "agent_dispatch_runs",
        "auto_create_pr",
        server_default=sa.text("true"),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
    if "execution_policy_json" in cols:
        op.drop_column("agent_dispatch_runs", "execution_policy_json")
    if "task_name" in cols:
        idxs = {i["name"] for i in insp.get_indexes("agent_dispatch_runs")}
        if "ix_agent_dispatch_runs_task_name" in idxs:
            op.drop_index("ix_agent_dispatch_runs_task_name", table_name="agent_dispatch_runs")
        op.drop_column("agent_dispatch_runs", "task_name")
