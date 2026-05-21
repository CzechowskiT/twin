"""Per-company recruiter inbox tokens (hashed)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "036_recruiter_company_tokens"
down_revision: Union[str, None] = "035_partner_api_keys"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recruiter_company_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_slug", sa.String(80), nullable=False, index=True),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("recruiter_company_tokens")
