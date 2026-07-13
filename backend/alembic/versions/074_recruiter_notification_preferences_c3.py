"""Recruiter in-app notification preferences (Wave C slice 3)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "074_recruiter_notification_preferences_c3"
down_revision: Union[str, None] = "073_candidate_referrals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "recruiter_notification_preferences"):
        return
    op.create_table(
        "recruiter_notification_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("in_app_inbox_digest", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("in_app_interview_reminder", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("in_app_trust_review_alert", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("in_app_pipeline_update", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_by_ref", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_slug", name="uq_recruiter_notification_prefs_company"),
    )
    op.create_index(
        "ix_recruiter_notification_prefs_company_slug",
        "recruiter_notification_preferences",
        ["company_slug"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_notification_prefs_company_slug", table_name="recruiter_notification_preferences")
    op.drop_table("recruiter_notification_preferences")
