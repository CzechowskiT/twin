"""Add AI Candidate Intelligence tables.

Revision ID: 103_candidate_intelligence
Revises: 102_first_real_pilot_intake
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "103_candidate_intelligence"
down_revision: Union[str, None] = "102_first_real_pilot_intake"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_intelligence_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=True, index=True),
        sa.Column("source_document_id", sa.String(length=128), nullable=True),
        sa.Column("source_version", sa.String(length=64), nullable=True),
        sa.Column("extraction_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("extraction_model", sa.String(length=64), nullable=True),
        sa.Column("extraction_version", sa.String(length=32), nullable=False, server_default="v1"),
        sa.Column("extraction_started_at", sa.DateTime(), nullable=True),
        sa.Column("extraction_completed_at", sa.DateTime(), nullable=True),
        sa.Column("current_role", sa.String(length=200), nullable=True),
        sa.Column("current_employer", sa.String(length=200), nullable=True),
        sa.Column("seniority", sa.String(length=32), nullable=True),
        sa.Column("total_experience_months", sa.Integer(), nullable=True),
        sa.Column("relevant_experience_months", sa.Integer(), nullable=True),
        sa.Column("primary_domains_json", sa.Text(), nullable=True),
        sa.Column("normalized_skills_json", sa.Text(), nullable=True),
        sa.Column("education_summary", sa.Text(), nullable=True),
        sa.Column("language_summary", sa.Text(), nullable=True),
        sa.Column("location_summary", sa.String(length=200), nullable=True),
        sa.Column("availability_summary", sa.String(length=200), nullable=True),
        sa.Column("profile_confidence", sa.String(length=16), nullable=True),
        sa.Column("warnings_json", sa.Text(), nullable=True),
        sa.Column("human_corrections_json", sa.Text(), nullable=True),
        sa.Column("cost_tokens_estimate", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cip_candidate_id", "candidate_intelligence_profiles", ["candidate_id"], unique=True)

    op.create_table(
        "candidate_employment_timeline_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employer", sa.String(length=200), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("normalized_title", sa.String(length=200), nullable=True),
        sa.Column("start_date", sa.String(length=32), nullable=True),
        sa.Column("end_date", sa.String(length=32), nullable=True),
        sa.Column("date_precision", sa.String(length=16), nullable=True),
        sa.Column("duration_months", sa.Integer(), nullable=True),
        sa.Column("employment_type", sa.String(length=64), nullable=True),
        sa.Column("responsibilities_json", sa.Text(), nullable=True),
        sa.Column("achievements_json", sa.Text(), nullable=True),
        sa.Column("technologies_json", sa.Text(), nullable=True),
        sa.Column("domains_json", sa.Text(), nullable=True),
        sa.Column("leadership_scope", sa.String(length=200), nullable=True),
        sa.Column("evidence_reference", sa.Text(), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cete_profile_id", "candidate_employment_timeline_entries", ["profile_id"])

    op.create_table(
        "candidate_intelligence_signals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signal_type", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=True),
        sa.Column("role_specific", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("human_review_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("dismissed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cis_profile_id", "candidate_intelligence_signals", ["profile_id"])

    op.create_table(
        "candidate_role_matches",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=True, index=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("tenant_id", sa.Integer(), nullable=True, index=True),
        sa.Column("overall_fit_band", sa.String(length=16), nullable=False),
        sa.Column("numeric_score", sa.Float(), nullable=True),
        sa.Column("score_version", sa.String(length=32), nullable=False, server_default="intel_v1"),
        sa.Column("dimensions_json", sa.Text(), nullable=True),
        sa.Column("strengths_json", sa.Text(), nullable=True),
        sa.Column("gaps_json", sa.Text(), nullable=True),
        sa.Column("unknowns_json", sa.Text(), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("stale_at", sa.DateTime(), nullable=True),
        sa.Column("recruiter_override", sa.String(length=16), nullable=True),
        sa.Column("recruiter_notes", sa.Text(), nullable=True),
        sa.Column("override_audit_json", sa.Text(), nullable=True),
        sa.Column("human_review_required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_crm_candidate_role", "candidate_role_matches", ["candidate_id", "role_id"])

    op.create_table(
        "candidate_missing_information",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=True),
        sa.Column("field", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("importance", sa.String(length=16), nullable=True),
        sa.Column("source_evidence", sa.Text(), nullable=True),
        sa.Column("recruiter_resolution", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cmi_profile_id", "candidate_missing_information", ["profile_id"])

    op.create_table(
        "candidate_recruiter_briefs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("profile_id", sa.Integer(), sa.ForeignKey("candidate_intelligence_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=True),
        sa.Column("brief", sa.Text(), nullable=False),
        sa.Column("factual_points_json", sa.Text(), nullable=True),
        sa.Column("inferred_points_json", sa.Text(), nullable=True),
        sa.Column("warnings_json", sa.Text(), nullable=True),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("model_version", sa.String(length=64), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_crb_candidate_id", "candidate_recruiter_briefs", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_recruiter_briefs")
    op.drop_table("candidate_missing_information")
    op.drop_table("candidate_role_matches")
    op.drop_table("candidate_intelligence_signals")
    op.drop_table("candidate_employment_timeline_entries")
    op.drop_table("candidate_intelligence_profiles")
