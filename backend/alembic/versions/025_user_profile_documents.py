"""User profile documents vault + consent timestamp."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "025_user_profile_documents"
down_revision: Union[str, None] = "024_user_notification_email_preferences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("profile_documents_processing_consent_at", sa.DateTime(), nullable=True),
    )
    op.create_table(
        "user_profile_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("storage_path", sa.String(length=768), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_user_profile_documents_user_id",
        "user_profile_documents",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_user_profile_documents_user_id", table_name="user_profile_documents")
    op.drop_table("user_profile_documents")
    op.drop_column("users", "profile_documents_processing_consent_at")
