"""Scoped partner API keys (hashed tokens)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "035_partner_api_keys"
down_revision: Union[str, None] = "034_placement_employer_attest"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "partner_api_keys",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("scopes", sa.String(255), nullable=False, server_default="export"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("partner_api_keys")
