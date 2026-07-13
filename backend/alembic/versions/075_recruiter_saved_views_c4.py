"""Recruiter saved filter views (Wave C slice 4)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "075_recruiter_saved_views_c4"
down_revision: Union[str, None] = "074_recruiter_notification_preferences_c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SURFACES = ("inbox", "talent_pool", "trust_review")


def upgrade() -> None:
    op.create_table(
        "recruiter_saved_views",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("surface", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("filter_json", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
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
        sa.UniqueConstraint("company_slug", "surface", "name", name="uq_recruiter_saved_view_name"),
    )
    op.create_index("ix_recruiter_saved_views_company_slug", "recruiter_saved_views", ["company_slug"])
    op.create_index("ix_recruiter_saved_views_surface", "recruiter_saved_views", ["surface"])


def downgrade() -> None:
    op.drop_index("ix_recruiter_saved_views_surface", table_name="recruiter_saved_views")
    op.drop_index("ix_recruiter_saved_views_company_slug", table_name="recruiter_saved_views")
    op.drop_table("recruiter_saved_views")
