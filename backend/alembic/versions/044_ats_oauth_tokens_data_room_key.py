"""ATS OAuth token columns + data room S3 object key."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "044_ats_oauth_tokens_data_room_key"
down_revision: Union[str, None] = "043_data_room_upload_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "recruiter_ats_oauth_connections",
        sa.Column("oauth_access_token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "recruiter_ats_oauth_connections",
        sa.Column("oauth_refresh_token_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "recruiter_ats_oauth_connections",
        sa.Column("oauth_token_expires_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "data_room_document_metadata",
        sa.Column("storage_key", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("data_room_document_metadata", "storage_key")
    op.drop_column("recruiter_ats_oauth_connections", "oauth_token_expires_at")
    op.drop_column("recruiter_ats_oauth_connections", "oauth_refresh_token_encrypted")
    op.drop_column("recruiter_ats_oauth_connections", "oauth_access_token_encrypted")
