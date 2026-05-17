"""Talent pool opt-in flag on candidates (B2B anonymous browse)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "007_candidate_talent_pool_opt_in"
down_revision: Union[str, None] = "006_user_billing_stripe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("candidates")}
    if "talent_pool_opt_in" not in cols:
        op.add_column(
            "candidates",
            sa.Column("talent_pool_opt_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("candidates")}
    if "talent_pool_opt_in" in cols:
        op.drop_column("candidates", "talent_pool_opt_in")
