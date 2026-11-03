"""Persistent data-room blobs for CORE_PILOT secure download.

ORM: DataRoomDocumentBlob
Service: app/services/data_room_upload.py
API: GET /investor/data-room/documents/{id}/download
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "099_data_room_document_blobs"
down_revision: Union[str, None] = "098_investor_external_attestations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("data_room_document_blobs"):
        op.create_table(
            "data_room_document_blobs",
            sa.Column("document_id", sa.Integer(), nullable=False),
            sa.Column("content", sa.LargeBinary(), nullable=False),
            sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
            sa.Column("size_bytes", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(
                ["document_id"],
                ["data_room_document_metadata.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("document_id"),
        )


def downgrade() -> None:
    if _has_table("data_room_document_blobs"):
        op.drop_table("data_room_document_blobs")
