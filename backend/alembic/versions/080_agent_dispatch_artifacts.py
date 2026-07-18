"""Persist expected and verified Agent Dispatcher workflow artifacts."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "080_agent_dispatch_artifacts"
down_revision: Union[str, None] = "079_agent_dispatch_policy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    columns = {column["name"] for column in sa.inspect(bind).get_columns("agent_dispatch_runs")}
    for name in ("expected_artifacts_json", "verified_artifacts_json"):
        if name not in columns:
            op.add_column("agent_dispatch_runs", sa.Column(name, sa.Text(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if not bind.dialect.has_table(bind, "agent_dispatch_runs"):
        return
    columns = {column["name"] for column in sa.inspect(bind).get_columns("agent_dispatch_runs")}
    for name in ("verified_artifacts_json", "expected_artifacts_json"):
        if name in columns:
            op.drop_column("agent_dispatch_runs", name)
