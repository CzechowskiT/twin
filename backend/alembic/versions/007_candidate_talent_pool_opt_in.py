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
    # PostgreSQL: single DDL, no Inspector round-trip (fewer failure modes under tight
    # deploy timeouts / log truncation). IF NOT EXISTS tolerates manual or partial applies.
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS "
                "talent_pool_opt_in BOOLEAN NOT NULL DEFAULT false"
            )
        )
        return

    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("candidates")}
    if "talent_pool_opt_in" not in cols:
        op.add_column(
            "candidates",
            sa.Column("talent_pool_opt_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE candidates DROP COLUMN IF EXISTS talent_pool_opt_in"))
        return

    insp = inspect(bind)
    cols = {c["name"] for c in insp.get_columns("candidates")}
    if "talent_pool_opt_in" in cols:
        op.drop_column("candidates", "talent_pool_opt_in")
