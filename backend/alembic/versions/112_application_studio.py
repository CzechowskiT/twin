"""Application Studio — evidence-backed application preparation (no external submit).

Revision ID: 112_application_studio
Revises: 111_career_evidence_portfolio
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "112_application_studio"
down_revision: Union[str, None] = "111_career_evidence_portfolio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_app_studio_workspaces",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=48), nullable=False, server_default="draft"),
        sa.Column("application_id", sa.Integer(), nullable=True),
        sa.Column("opportunity_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("requirements_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("fit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("viability_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("strategy_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("checklist_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("readiness_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_synthetic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("kpi_excluded", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "workspace_key", name="uq_app_studio_workspace_key"),
    )
    op.create_index("ix_app_studio_workspaces_candidate_id", "candidate_app_studio_workspaces", ["candidate_id"])

    op.create_table(
        "candidate_app_studio_cv_drafts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("candidate_app_studio_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("draft_key", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("body_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("audit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "draft_key", name="uq_app_studio_cv_draft_key"),
    )
    op.create_index("ix_app_studio_cv_drafts_workspace_id", "candidate_app_studio_cv_drafts", ["workspace_id"])

    op.create_table(
        "candidate_app_studio_cover_letters",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("candidate_app_studio_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("letter_key", sa.String(length=160), nullable=False),
        sa.Column("body_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="SUGGESTION"),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "letter_key", name="uq_app_studio_cover_key"),
    )

    op.create_table(
        "candidate_app_studio_screening_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("candidate_app_studio_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("answer_key", sa.String(length=160), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("sensitive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("auto_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("claim_kind", sa.String(length=32), nullable=False, server_default="UNKNOWN"),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("audit_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("approved", sa.Boolean(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "answer_key", name="uq_app_studio_answer_key"),
    )

    op.create_table(
        "candidate_app_studio_assets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("candidate_app_studio_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_key", sa.String(length=160), nullable=False),
        sa.Column("asset_kind", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("evidence_ids_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("confidentiality", sa.String(length=40), nullable=False, server_default="PRIVATE"),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "asset_key", name="uq_app_studio_asset_key"),
    )

    op.create_table(
        "candidate_app_studio_submissions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("candidate_app_studio_workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("submission_key", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=48), nullable=False, server_default="not_submitted"),
        sa.Column("provenance", sa.String(length=64), nullable=False, server_default="none"),
        sa.Column("declared_at", sa.DateTime(), nullable=True),
        sa.Column("declared_channel", sa.String(length=64), nullable=True),
        sa.Column("external_submit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("payload_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "submission_key", name="uq_app_studio_submission_key"),
    )

    op.create_table(
        "candidate_app_studio_privacy",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ai_drafting_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("memory_reuse_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("export_include_confidential", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", name="uq_app_studio_privacy_candidate"),
    )

    op.create_table(
        "candidate_app_studio_audits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("after_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_app_studio_audits_candidate_id", "candidate_app_studio_audits", ["candidate_id"])


def downgrade() -> None:
    op.drop_table("candidate_app_studio_audits")
    op.drop_table("candidate_app_studio_privacy")
    op.drop_table("candidate_app_studio_submissions")
    op.drop_table("candidate_app_studio_assets")
    op.drop_table("candidate_app_studio_screening_answers")
    op.drop_table("candidate_app_studio_cover_letters")
    op.drop_table("candidate_app_studio_cv_drafts")
    op.drop_table("candidate_app_studio_workspaces")
