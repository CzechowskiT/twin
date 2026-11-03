"""Career Evidence Portfolio — source-backed proof of competence.

Revision ID: 111_career_evidence_portfolio
Revises: 110_acceptance_calendar
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "111_career_evidence_portfolio"
down_revision: Union[str, None] = "110_acceptance_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_evidence_sources",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_key", sa.String(length=160), nullable=False),
        sa.Column("source_kind", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False, server_default=""),
        sa.Column("location_ref", sa.String(length=500), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("mime_type", sa.String(length=120), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("supersedes_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "source_key", name="uq_evidence_source_key"),
    )
    op.create_index("ix_candidate_evidence_sources_candidate_id", "candidate_evidence_sources", ["candidate_id"])

    op.create_table(
        "candidate_career_evidence",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_key", sa.String(length=160), nullable=False),
        sa.Column("evidence_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("context_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("action_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("result_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("metrics_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("technologies_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("skills_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("target_roles_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("source_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("quality", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("quality_explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("confidentiality", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("external_usability", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("verification_state", sa.String(length=40), nullable=False, server_default="UNCONFIRMED"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("occurred_from", sa.DateTime(), nullable=True),
        sa.Column("occurred_to", sa.DateTime(), nullable=True),
        sa.Column("redacted_of_id", sa.Integer(), nullable=True),
        sa.Column("supersedes_id", sa.Integer(), nullable=True),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("archived_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "evidence_key", name="uq_career_evidence_key"),
    )
    op.create_index("ix_candidate_career_evidence_candidate_id", "candidate_career_evidence", ["candidate_id"])

    op.create_table(
        "candidate_evidence_fields",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_id", sa.Integer(), sa.ForeignKey("candidate_career_evidence.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_name", sa.String(length=80), nullable=False),
        sa.Column("field_value_json", sa.Text(), nullable=False, server_default="null"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("confirmation", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("source_location", sa.String(length=500), nullable=True),
        sa.Column("confidence", sa.String(length=16), nullable=False, server_default="low"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("history_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("evidence_id", "field_name", name="uq_evidence_field_name"),
    )
    op.create_index("ix_candidate_evidence_fields_candidate_id", "candidate_evidence_fields", ["candidate_id"])

    op.create_table(
        "candidate_evidence_claims",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_id", sa.Integer(), sa.ForeignKey("candidate_career_evidence.id", ondelete="CASCADE"), nullable=True),
        sa.Column("claim_key", sa.String(length=160), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("consistency", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("conflict_with_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("source_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "claim_key", name="uq_evidence_claim_key"),
    )
    op.create_index("ix_candidate_evidence_claims_candidate_id", "candidate_evidence_claims", ["candidate_id"])

    op.create_table(
        "candidate_evidence_skill_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_id", sa.Integer(), sa.ForeignKey("candidate_career_evidence.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill", sa.String(length=120), nullable=False),
        sa.Column("link_state", sa.String(length=40), nullable=False, server_default="CLAIM_ONLY"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="INFERENCE"),
        sa.Column("mastery_claim", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("evidence_explain_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("evidence_id", "skill", name="uq_evidence_skill_link"),
    )
    op.create_index("ix_candidate_evidence_skill_links_candidate_id", "candidate_evidence_skill_links", ["candidate_id"])

    op.create_table(
        "candidate_portfolio_projects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("external_safe_title", sa.String(length=300), nullable=True),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("skills_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("confidentiality", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "project_key", name="uq_portfolio_project_key"),
    )
    op.create_index("ix_candidate_portfolio_projects_candidate_id", "candidate_portfolio_projects", ["candidate_id"])

    op.create_table(
        "candidate_interview_stories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("story_key", sa.String(length=160), nullable=False),
        sa.Column("theme", sa.String(length=64), nullable=False),
        sa.Column("framework", sa.String(length=16), nullable=False, server_default="STAR"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "story_key", name="uq_interview_story_key"),
    )
    op.create_index("ix_candidate_interview_stories_candidate_id", "candidate_interview_stories", ["candidate_id"])

    op.create_table(
        "candidate_cv_bullet_drafts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bullet_key", sa.String(length=160), nullable=False),
        sa.Column("source_bullet", sa.Text(), nullable=True),
        sa.Column("draft_text", sa.Text(), nullable=False),
        sa.Column("audit_status", sa.String(length=40), nullable=False, server_default="needs_rewrite"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("target_role", sa.String(length=200), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "bullet_key", name="uq_cv_bullet_key"),
    )
    op.create_index("ix_candidate_cv_bullet_drafts_candidate_id", "candidate_cv_bullet_drafts", ["candidate_id"])

    op.create_table(
        "candidate_application_evidence_packs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("pack_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("fit_kind", sa.String(length=40), nullable=False, server_default="UNKNOWN"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("gaps_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("auto_submit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "pack_key", name="uq_app_evidence_pack_key"),
    )
    op.create_index(
        "ix_candidate_application_evidence_packs_candidate_id",
        "candidate_application_evidence_packs",
        ["candidate_id"],
    )

    op.create_table(
        "candidate_evidence_privacy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ai_extraction_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("drafting_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("memory_reuse_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("portfolio_inclusion_default", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("export_include_confidential", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_evidence_privacy_candidate"),
    )

    op.create_table(
        "candidate_evidence_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_candidate_evidence_audits_candidate_id", "candidate_evidence_audits", ["candidate_id"])


def downgrade() -> None:
    for t in (
        "candidate_evidence_audits",
        "candidate_evidence_privacy",
        "candidate_application_evidence_packs",
        "candidate_cv_bullet_drafts",
        "candidate_interview_stories",
        "candidate_portfolio_projects",
        "candidate_evidence_skill_links",
        "candidate_evidence_claims",
        "candidate_evidence_fields",
        "candidate_career_evidence",
        "candidate_evidence_sources",
    ):
        op.drop_table(t)
