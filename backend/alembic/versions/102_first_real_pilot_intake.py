"""Add intake fields for first real pilot org activation.

Revision ID: 102_first_real_pilot_intake
Revises: 101_first_customer_activation
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "102_first_real_pilot_intake"
down_revision: Union[str, None] = "101_first_customer_activation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pilot_organizations",
        sa.Column("legal_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "pilot_organizations",
        sa.Column("sponsor_label", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "pilot_organizations",
        sa.Column("founder_org_approval_ref", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pilot_organizations", "founder_org_approval_ref")
    op.drop_column("pilot_organizations", "sponsor_label")
    op.drop_column("pilot_organizations", "legal_name")
