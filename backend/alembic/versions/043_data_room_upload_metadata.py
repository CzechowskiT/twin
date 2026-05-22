"""Investor data room document metadata (upload stub; no S3 blob until configured)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "043_data_room_upload_metadata"
down_revision: Union[str, None] = "042_recruiter_ats_oauth_connections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "data_room_document_metadata",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'validated'")),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_data_room_document_metadata_user_id",
        "data_room_document_metadata",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_data_room_document_metadata_user_id", table_name="data_room_document_metadata")
    op.drop_table("data_room_document_metadata")
