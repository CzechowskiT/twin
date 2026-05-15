"""Initial schema: users, candidates, jobs, matches, applications.

Revision ID: 001
Revises:
Create Date: 2026-05-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("gdpr_consent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "candidates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), unique=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("skills", sa.Text(), nullable=False),
        sa.Column("experience_years", sa.Integer(), nullable=False),
        sa.Column("desired_salary", sa.Integer(), nullable=True),
        sa.Column("location", sa.String(100), nullable=True),
        sa.Column("resume_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_board", sa.String(50), nullable=False),
        sa.Column("external_id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("company", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("salary_min", sa.Integer(), nullable=True),
        sa.Column("salary_max", sa.Integer(), nullable=True),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("is_validated", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("scraped_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("job_board", "external_id", name="uq_job_board_external"),
    )
    op.create_index("ix_jobs_job_board", "jobs", ["job_board"])

    op.create_table(
        "job_matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id")),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id")),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("match_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id")),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id")),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "applied",
                "interview",
                "rejected",
                "hired",
                name="applicationstatus",
            ),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("applications")
    op.drop_table("job_matches")
    op.drop_table("jobs")
    op.drop_table("candidates")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS applicationstatus")
