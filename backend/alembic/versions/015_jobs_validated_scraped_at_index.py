"""Partial index for matching: newest validated jobs first."""

from typing import Sequence, Union

from alembic import op

revision: str = "015_jobs_validated_scraped_at_index"
down_revision: Union[str, None] = "014_scheduled_interviews"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_jobs_validated_scraped_at_desc
        ON jobs (scraped_at DESC)
        WHERE is_validated = true
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_jobs_validated_scraped_at_desc")
