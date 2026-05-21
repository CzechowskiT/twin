"""Auto-apply consent, nightly run log, application auto_applied flags."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "037_auto_apply_consent_nightly"
down_revision: Union[str, None] = "036_recruiter_company_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auto_apply_consents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("consent_given_at", sa.DateTime(), nullable=True),
        sa.Column("consent_text_version", sa.String(32), nullable=False, server_default="v1"),
        sa.Column("min_score_threshold", sa.Float(), nullable=False, server_default="90"),
        sa.Column("daily_limit", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("total_applications_submitted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_auto_apply_consents_candidate_id", "auto_apply_consents", ["candidate_id"], unique=True)

    op.create_table(
        "auto_apply_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("total_users_processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_applications_submitted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_applications_failed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stats_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.add_column(
        "applications",
        sa.Column("auto_applied", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "applications",
        sa.Column("application_method", sa.String(32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("applications", "application_method")
    op.drop_column("applications", "auto_applied")
    op.drop_table("auto_apply_runs")
    op.drop_table("auto_apply_consents")
