"""Recruiter application scorecards — internal notes, not in audit trail."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "056_recruiter_application_scorecards"
down_revision: Union[str, None] = "055_recruiter_manual_scheduling"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recruiter_application_scorecards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", "company_slug", name="uq_recruiter_scorecard_app_company"),
    )
    op.create_index(
        "ix_recruiter_application_scorecards_application_id",
        "recruiter_application_scorecards",
        ["application_id"],
    )
    op.create_index(
        "ix_recruiter_application_scorecards_company_slug",
        "recruiter_application_scorecards",
        ["company_slug"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_application_scorecards_company_slug", table_name="recruiter_application_scorecards")
    op.drop_index("ix_recruiter_application_scorecards_application_id", table_name="recruiter_application_scorecards")
    op.drop_table("recruiter_application_scorecards")
