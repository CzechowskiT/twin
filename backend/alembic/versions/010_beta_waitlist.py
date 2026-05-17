"""Viral beta waitlist + referrals (public signup, no product User required)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_beta_waitlist"
down_revision: Union[str, None] = "009_gdpr_proc_marketing_prefs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "beta_waitlist",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("linkedin_subject", sa.String(length=255), nullable=True),
        sa.Column("job_title", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("min_salary", sa.Integer(), nullable=True),
        sa.Column("cv_path", sa.Text(), nullable=True),
        sa.Column("voice_path", sa.Text(), nullable=True),
        sa.Column("referral_code", sa.String(length=32), nullable=False),
        sa.Column("referred_by_code", sa.String(length=32), nullable=True),
        sa.Column("priority_points", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("linkedin_shared", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("cv_uploaded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("voice_recorded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("testimonial_posted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_beta_waitlist_email"),
        sa.UniqueConstraint("referral_code", name="uq_beta_waitlist_referral_code"),
    )
    op.create_index("ix_beta_waitlist_referred_by_code", "beta_waitlist", ["referred_by_code"])
    op.create_index("ix_beta_waitlist_created_at", "beta_waitlist", ["created_at"])

    op.create_table(
        "beta_referrals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("referrer_code", sa.String(length=32), nullable=False),
        sa.Column("referee_waitlist_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["referee_waitlist_id"],
            ["beta_waitlist.id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_beta_referrals_referrer_code", "beta_referrals", ["referrer_code"])


def downgrade() -> None:
    op.drop_index("ix_beta_referrals_referrer_code", table_name="beta_referrals")
    op.drop_table("beta_referrals")
    op.drop_index("ix_beta_waitlist_created_at", table_name="beta_waitlist")
    op.drop_index("ix_beta_waitlist_referred_by_code", table_name="beta_waitlist")
    op.drop_table("beta_waitlist")
