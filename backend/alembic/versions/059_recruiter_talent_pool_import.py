"""Recruiter talent pool imports and structured internal records.

ORM: app/database/models.py::RecruiterTalentPoolImport, RecruiterTalentPoolRecord
Service: app/services/recruiter_talent_pool_import.py
Design: docs/RECRUITER_TALENT_POOL_IMPORT_MVP_2026-06-15.md
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "059_recruiter_talent_pool_import"
down_revision: Union[str, None] = "058_recruiter_talent_radar_decisions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    imports_exists = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'recruiter_talent_pool_imports' "
            "LIMIT 1"
        )
    ).fetchone()
    if imports_exists:
        return
    op.create_table(
        "recruiter_talent_pool_imports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("import_source", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="preview"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("warnings_json", sa.Text(), nullable=True),
        sa.Column("audit_json", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("committed_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recruiter_talent_pool_imports_company_slug",
        "recruiter_talent_pool_imports",
        ["company_slug"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_imports_created_at",
        "recruiter_talent_pool_imports",
        ["created_at"],
    )

    op.create_table(
        "recruiter_talent_pool_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_slug", sa.String(length=80), nullable=False),
        sa.Column("import_id", sa.Integer(), nullable=True),
        sa.Column("candidate_id", sa.String(length=64), nullable=True),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("external_ats_id", sa.String(length=128), nullable=True),
        sa.Column("display_name", sa.String(length=200), nullable=False),
        sa.Column("job_title", sa.String(length=200), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("seniority", sa.String(length=64), nullable=True),
        sa.Column("skills_json", sa.Text(), nullable=True),
        sa.Column("data_quality_json", sa.Text(), nullable=True),
        sa.Column("duplicate_key", sa.String(length=128), nullable=False),
        sa.Column("pipeline_status", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["import_id"], ["recruiter_talent_pool_imports.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_company_slug",
        "recruiter_talent_pool_records",
        ["company_slug"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_candidate_id",
        "recruiter_talent_pool_records",
        ["candidate_id"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_application_id",
        "recruiter_talent_pool_records",
        ["application_id"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_job_id",
        "recruiter_talent_pool_records",
        ["job_id"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_external_ats_id",
        "recruiter_talent_pool_records",
        ["external_ats_id"],
    )
    op.create_index(
        "ix_recruiter_talent_pool_records_duplicate_key",
        "recruiter_talent_pool_records",
        ["duplicate_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_recruiter_talent_pool_records_duplicate_key", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_external_ats_id", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_job_id", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_application_id", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_candidate_id", table_name="recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_records_company_slug", table_name="recruiter_talent_pool_records")
    op.drop_table("recruiter_talent_pool_records")
    op.drop_index("ix_recruiter_talent_pool_imports_created_at", table_name="recruiter_talent_pool_imports")
    op.drop_index("ix_recruiter_talent_pool_imports_company_slug", table_name="recruiter_talent_pool_imports")
    op.drop_table("recruiter_talent_pool_imports")
