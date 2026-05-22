"""Career assistant tables (US-C052–057)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "040_career_assistant_tables"
down_revision: Union[str, None] = "039_company_intelligence_cache"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "optimized_cvs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_before", sa.Float(), nullable=False, server_default="0"),
        sa.Column("match_after", sa.Float(), nullable=False, server_default="0"),
        sa.Column("changes_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("optimized_cv_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_optimized_cvs_application_id", "optimized_cvs", ["application_id"], unique=True)

    op.create_table(
        "interview_prep_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "scheduled_interview_id",
            sa.Integer(),
            sa.ForeignKey("scheduled_interviews.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "application_id",
            sa.Integer(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("prep_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_interview_prep_user_id", "interview_prep_sessions", ["user_id"])
    op.create_index("ix_interview_prep_scheduled_interview_id", "interview_prep_sessions", ["scheduled_interview_id"])
    op.create_index("ix_interview_prep_application_id", "interview_prep_sessions", ["application_id"])

    op.create_table(
        "salary_negotiations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("application_id", sa.Integer(), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("negotiation_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_salary_negotiations_application_id", "salary_negotiations", ["application_id"])

    op.create_table(
        "follow_up_emails",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "scheduled_interview_id",
            sa.Integer(),
            sa.ForeignKey("scheduled_interviews.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("email_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_follow_up_emails_scheduled_interview_id", "follow_up_emails", ["scheduled_interview_id"])

    op.create_table(
        "hiring_insights_cache",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("insights_json", sa.Text(), nullable=False),
        sa.Column("researched_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_hiring_insights_job_id", "hiring_insights_cache", ["job_id"])

    op.create_table(
        "linkedin_optimizations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_role", sa.String(200), nullable=False),
        sa.Column("optimization_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_linkedin_optimizations_candidate_id", "linkedin_optimizations", ["candidate_id"])


def downgrade() -> None:
    op.drop_index("ix_linkedin_optimizations_candidate_id", table_name="linkedin_optimizations")
    op.drop_table("linkedin_optimizations")
    op.drop_index("ix_hiring_insights_job_id", table_name="hiring_insights_cache")
    op.drop_table("hiring_insights_cache")
    op.drop_index("ix_follow_up_emails_scheduled_interview_id", table_name="follow_up_emails")
    op.drop_table("follow_up_emails")
    op.drop_index("ix_salary_negotiations_application_id", table_name="salary_negotiations")
    op.drop_table("salary_negotiations")
    op.drop_index("ix_interview_prep_application_id", table_name="interview_prep_sessions")
    op.drop_index("ix_interview_prep_scheduled_interview_id", table_name="interview_prep_sessions")
    op.drop_index("ix_interview_prep_user_id", table_name="interview_prep_sessions")
    op.drop_table("interview_prep_sessions")
    op.drop_index("ix_optimized_cvs_application_id", table_name="optimized_cvs")
    op.drop_table("optimized_cvs")
