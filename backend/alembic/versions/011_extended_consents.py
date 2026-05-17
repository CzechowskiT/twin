"""Extended GDPR-related consent timestamps on users, talent pool opt-in audit, beta waitlist consents."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_extended_consents"
down_revision: Union[str, None] = "010_beta_waitlist"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("terms_of_service_accepted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("job_data_processing_consent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("ai_matching_consent_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("identity_provider_processing_consent_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        """
        UPDATE users SET
          terms_of_service_accepted_at = gdpr_consent_at,
          job_data_processing_consent_at = gdpr_consent_at,
          ai_matching_consent_at = gdpr_consent_at
        WHERE gdpr_consent_at IS NOT NULL
        """
    )
    op.add_column(
        "candidates",
        sa.Column("talent_pool_opt_in_at", sa.DateTime(), nullable=True),
    )
    op.execute(
        """
        UPDATE candidates SET talent_pool_opt_in_at = created_at
        WHERE talent_pool_opt_in IS TRUE
        """
    )
    op.add_column(
        "beta_waitlist",
        sa.Column("privacy_and_email_consent_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("beta_waitlist", "privacy_and_email_consent_at")
    op.drop_column("candidates", "talent_pool_opt_in_at")
    op.drop_column("users", "identity_provider_processing_consent_at")
    op.drop_column("users", "ai_matching_consent_at")
    op.drop_column("users", "job_data_processing_consent_at")
    op.drop_column("users", "terms_of_service_accepted_at")
