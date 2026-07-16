"""Agent Dispatcher policy columns — task_name, execution_policy, auto_create_pr default false."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "079_agent_dispatch_policy"
down_revision: Union[str, None] = "078_agent_dispatch"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_dispatch_runs",
        sa.Column("task_name", sa.String(length=128), nullable=True),
    )
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
    op.alter_column(
        "agent_dispatch_runs",
        "auto_create_pr",
        server_default=sa.text("true"),
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
    op.drop_column("agent_dispatch_runs", "execution_policy_json")
    op.drop_column("agent_dispatch_runs", "task_name")
