"""Optional marketing opt-in + explicit CV / intro-audio processing consent timestamps."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_gdpr_proc_marketing_prefs"
down_revision: Union[str, None] = "008_identity_verif_authologic"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("marketing_emails_opt_in", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column("users", sa.Column("marketing_emails_opt_in_at", sa.DateTime(), nullable=True))
    op.add_column("candidates", sa.Column("cv_processing_consent_at", sa.DateTime(), nullable=True))
    op.add_column(
        "candidates",
        sa.Column("intro_audio_processing_consent_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidates", "intro_audio_processing_consent_at")
    op.drop_column("candidates", "cv_processing_consent_at")
    op.drop_column("users", "marketing_emails_opt_in_at")
    op.drop_column("users", "marketing_emails_opt_in")
