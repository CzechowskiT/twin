"""Candidate preferred job titles and intro audio metadata."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_candidate_titles_intro_audio"
down_revision: Union[str, None] = "004_password_reset_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidates",
        sa.Column("preferred_job_titles", sa.Text(), server_default="[]", nullable=False),
    )
    op.add_column("candidates", sa.Column("intro_audio_path", sa.String(length=500), nullable=True))
    op.add_column("candidates", sa.Column("intro_audio_uploaded_at", sa.DateTime(), nullable=True))
    op.add_column("candidates", sa.Column("intro_audio_transcript", sa.Text(), nullable=True))
    op.add_column("candidates", sa.Column("profile_signals_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "profile_signals_json")
    op.drop_column("candidates", "intro_audio_transcript")
    op.drop_column("candidates", "intro_audio_uploaded_at")
    op.drop_column("candidates", "intro_audio_path")
    op.drop_column("candidates", "preferred_job_titles")
