"""Employer one-click placement attestation token fields."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "034_placement_employer_attest"
down_revision: Union[str, None] = "033_product_feedback_onboarding"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("placement_employer_attest_token_hash", sa.String(64), nullable=True),
    )
    op.add_column(
        "applications",
        sa.Column("placement_employer_attest_expires_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "placement_employer_attest_expires_at")
    op.drop_column("applications", "placement_employer_attest_token_hash")
