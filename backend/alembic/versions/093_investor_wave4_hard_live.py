"""Investor Wave 4 — NDA acceptance + Hard LIVE evidence seed.

ORM: InvestorNdaAcceptance
Service: app/services/investor_wave4.py
API: app/api/investor_wave4.py
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md Wave 4
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "093_investor_wave4_hard_live"
down_revision: Union[str, None] = "092_career_evidence_ai_compliance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("investor_nda_acceptances"):
        op.create_table(
            "investor_nda_acceptances",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("nda_version", sa.String(length=32), nullable=False),
            sa.Column("ip_hash", sa.String(length=64), nullable=True),
            sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
            sa.Column(
                "accepted_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "nda_version", name="uq_investor_nda_user_version"),
        )
        op.create_index(
            "ix_investor_nda_user_id",
            "investor_nda_acceptances",
            ["user_id"],
        )


def downgrade() -> None:
    if _has_table("investor_nda_acceptances"):
        op.drop_index("ix_investor_nda_user_id", table_name="investor_nda_acceptances")
        op.drop_table("investor_nda_acceptances")
