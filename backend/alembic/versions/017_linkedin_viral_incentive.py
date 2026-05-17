"""LinkedIn viral incentive claims, signup UTM attribution, referral public tokens."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_linkedin_viral_incentive"
down_revision: Union[str, None] = "016_user_signup_referral"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("referral_public_token", sa.String(32), nullable=True))
    op.add_column("users", sa.Column("signup_utm_source", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("signup_utm_medium", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("signup_utm_campaign", sa.String(128), nullable=True))
    op.add_column("users", sa.Column("signup_utm_content", sa.String(128), nullable=True))
    op.create_index("ix_users_referral_public_token", "users", ["referral_public_token"], unique=True)
    op.create_index("ix_users_signup_utm_content", "users", ["signup_utm_content"], unique=False)

    op.create_table(
        "linkedin_viral_incentive_claims",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "application_id",
            sa.Integer(),
            sa.ForeignKey("applications.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("post_url", sa.String(2048), nullable=False),
        sa.Column("word_count", sa.Integer(), nullable=True),
        sa.Column("has_offer_letter_photo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("has_video_testimonial", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("screenshot_url_primary", sa.String(2048), nullable=True),
        sa.Column("screenshot_url_secondary", sa.String(2048), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("bonus_cents_calculated", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("bonus_currency", sa.String(8), server_default=sa.text("'USD'"), nullable=False),
        sa.Column("status", sa.String(32), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
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
    )
    op.create_index(
        "ix_linkedin_viral_incentive_claims_user_id",
        "linkedin_viral_incentive_claims",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_linkedin_viral_incentive_claims_application_id",
        "linkedin_viral_incentive_claims",
        ["application_id"],
        unique=False,
    )

    bind = op.get_bind()
    if bind is not None and bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                """
                UPDATE users
                SET referral_public_token = substring(
                    replace(cast(gen_random_uuid() AS text), '-', ''),
                    1,
                    16
                )
                WHERE referral_public_token IS NULL
                """
            )
        )


def downgrade() -> None:
    op.drop_index("ix_linkedin_viral_incentive_claims_application_id", table_name="linkedin_viral_incentive_claims")
    op.drop_index("ix_linkedin_viral_incentive_claims_user_id", table_name="linkedin_viral_incentive_claims")
    op.drop_table("linkedin_viral_incentive_claims")
    op.drop_index("ix_users_signup_utm_content", table_name="users")
    op.drop_index("ix_users_referral_public_token", table_name="users")
    op.drop_column("users", "signup_utm_content")
    op.drop_column("users", "signup_utm_campaign")
    op.drop_column("users", "signup_utm_medium")
    op.drop_column("users", "signup_utm_source")
    op.drop_column("users", "referral_public_token")
