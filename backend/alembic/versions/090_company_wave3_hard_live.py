"""Company Wave 3 — org settings + scorecards + Hard LIVE evidence seed support.

ORM: CompanyOrgSettings, CompanyScorecardEntry
Service: app/services/company_wave3.py
API: app/api/company_wave3.py + company Wave 3 routes
Plan: docs/FULL_PRODUCT_PRODUCTIONIZATION_PLAN.md Wave 3
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "090_company_wave3_hard_live"
down_revision: Union[str, None] = "089_recruiter_wave2_hard_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return name in inspect(bind).get_table_names()


def upgrade() -> None:
    if not _has_table("company_org_settings"):
        op.create_table(
            "company_org_settings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_slug", sa.String(length=80), nullable=False),
            sa.Column("display_name", sa.String(length=200), nullable=False),
            sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Europe/Warsaw"),
            sa.Column("locale", sa.String(length=16), nullable=False, server_default="pl"),
            sa.Column("hiring_policy_json", sa.Text(), nullable=True),
            sa.Column("updated_by_role", sa.String(length=64), nullable=True),
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
            sa.UniqueConstraint("company_slug", name="uq_company_org_settings_slug"),
        )
        op.create_index("ix_company_org_settings_slug", "company_org_settings", ["company_slug"])

    if not _has_table("company_scorecard_entries"):
        op.create_table(
            "company_scorecard_entries",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("company_slug", sa.String(length=80), nullable=False),
            sa.Column("subject_type", sa.String(length=32), nullable=False),
            sa.Column("subject_id", sa.String(length=64), nullable=False),
            sa.Column("role_id", sa.Integer(), nullable=True),
            sa.Column("decision_code", sa.String(length=64), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=True),
            sa.Column("summary", sa.String(length=500), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False, server_default="live"),
            sa.Column("demo_fixture", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("meta_json", sa.Text(), nullable=True),
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
        )
        op.create_index("ix_company_scorecard_company", "company_scorecard_entries", ["company_slug"])
        op.create_index(
            "ix_company_scorecard_subject",
            "company_scorecard_entries",
            ["company_slug", "subject_type", "subject_id"],
        )


def downgrade() -> None:
    if _has_table("company_scorecard_entries"):
        op.drop_index("ix_company_scorecard_subject", table_name="company_scorecard_entries")
        op.drop_index("ix_company_scorecard_company", table_name="company_scorecard_entries")
        op.drop_table("company_scorecard_entries")
    if _has_table("company_org_settings"):
        op.drop_index("ix_company_org_settings_slug", table_name="company_org_settings")
        op.drop_table("company_org_settings")
