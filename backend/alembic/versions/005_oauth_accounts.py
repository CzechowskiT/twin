"""Normalized OAuth account links (multi-provider per user)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_oauth_accounts"
down_revision: Union[str, None] = "005_candidate_titles_intro_audio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider", "subject", name="uq_oauth_accounts_provider_subject"),
    )
    op.create_index("ix_oauth_accounts_user_id", "oauth_accounts", ["user_id"])

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO oauth_accounts (user_id, provider, subject, created_at)
            SELECT id, 'linkedin', linkedin_id, created_at
            FROM users
            WHERE linkedin_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_oauth_accounts_user_id", table_name="oauth_accounts")
    op.drop_table("oauth_accounts")
