"""Company intelligence cache for US-C051."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "039_company_intelligence_cache"
down_revision: Union[str, None] = "038_email_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company_intelligence_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("company_name", sa.String(200), nullable=False),
        sa.Column("job_title", sa.String(200), nullable=False),
        sa.Column("intel_json", sa.Text(), nullable=False),
        sa.Column("researched_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index(
        "ix_company_intel_company_title",
        "company_intelligence_cache",
        ["company_name", "job_title"],
    )


def downgrade() -> None:
    op.drop_index("ix_company_intel_company_title", table_name="company_intelligence_cache")
    op.drop_table("company_intelligence_cache")
