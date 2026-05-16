"""Identity verification sessions (Authologic KYC) + user-level verified timestamp."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_identity_verifications_authologic"
down_revision: Union[str, None] = "007_candidate_talent_pool_opt_in"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("identity_verified_at", sa.DateTime(), nullable=True))
    op.create_table(
        "identity_verifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="authologic"),
        sa.Column("conversation_id", sa.String(length=64), nullable=False),
        sa.Column("user_key", sa.String(length=200), nullable=False),
        sa.Column("conversation_status", sa.String(length=32), nullable=True),
        sa.Column("identity_status", sa.String(length=32), nullable=True),
        sa.Column("redirect_url", sa.String(length=1024), nullable=True),
        sa.Column("summary_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_identity_verifications_conversation_id",
        "identity_verifications",
        ["conversation_id"],
        unique=True,
    )
    op.create_index("ix_identity_verifications_user_id", "identity_verifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_identity_verifications_user_id", table_name="identity_verifications")
    op.drop_index("ix_identity_verifications_conversation_id", table_name="identity_verifications")
    op.drop_table("identity_verifications")
    op.drop_column("users", "identity_verified_at")
