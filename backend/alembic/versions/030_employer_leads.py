"""Public employer / company signup interest (non-auth lead capture)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "030_employer_leads"
down_revision: Union[str, None] = "029_scheduled_interview_ics_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employer_leads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employer_leads_email", "employer_leads", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_employer_leads_email", table_name="employer_leads")
    op.drop_table("employer_leads")
