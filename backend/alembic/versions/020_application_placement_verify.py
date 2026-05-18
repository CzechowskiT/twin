"""Placement self-verify: work email magic link (no manual CS loop)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020_placement_verify"
down_revision: Union[str, None] = "019_alembic_ver_widen"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "applications",
        sa.Column("placement_state", sa.String(length=32), nullable=False, server_default="none"),
    )
    op.add_column("applications", sa.Column("placement_reported_at", sa.DateTime(), nullable=True))
    op.add_column("applications", sa.Column("placement_work_email", sa.String(length=320), nullable=True))
    op.add_column("applications", sa.Column("placement_verification_token_hash", sa.String(length=64), nullable=True))
    op.add_column("applications", sa.Column("placement_verification_expires_at", sa.DateTime(), nullable=True))
    op.add_column("applications", sa.Column("placement_verified_at", sa.DateTime(), nullable=True))
    op.create_index(
        "ix_applications_placement_token_hash",
        "applications",
        ["placement_verification_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_applications_placement_token_hash", table_name="applications")
    op.drop_column("applications", "placement_verified_at")
    op.drop_column("applications", "placement_verification_expires_at")
    op.drop_column("applications", "placement_verification_token_hash")
    op.drop_column("applications", "placement_work_email")
    op.drop_column("applications", "placement_reported_at")
    op.drop_column("applications", "placement_state")
